import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGeminiClient, dsrRateLimiter, DSRInput } from '@/lib/gemini';
import dayjs from 'dayjs';

/**
 * POST /api/generate-dsr
 * 
 * Protected endpoint for generating Daily Status Reports
 * Called by GitHub Actions scheduled job or manually
 * 
 * Headers:
 *   X-DSR-Secret: Secret token for authentication
 * 
 * Body:
 *   userId: string (optional, generates for all users if omitted)
 *   date: string (optional, defaults to yesterday)
 *   forceRegenerate: boolean (optional, regenerate if DSR exists)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify secret header
    const secret = request.headers.get('x-dsr-secret');
    const expectedSecret = process.env.DSR_GENERATION_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      userId,
      date = dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      forceRegenerate = false,
    } = body;

    // Rate limiting check
    const canProceed = await dsrRateLimiter.checkLimit();
    if (!canProceed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          remaining: dsrRateLimiter.getRemaining(),
        },
        { status: 429 }
      );
    }

    // Determine which users to generate DSRs for
    const users = userId
      ? await prisma.user.findMany({ where: { id: userId } })
      : await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'LEADER', 'MEMBER'] },
          },
        });

    if (users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 404 });
    }

    const results = [];
    const geminiClient = getGeminiClient();

    for (const user of users) {
      try {
        // Check if DSR already exists
        const existingDSR = await prisma.dSR.findUnique({
          where: {
            userId_date: {
              userId: user.id,
              date: new Date(date),
            },
          },
        });

        if (existingDSR && !forceRegenerate) {
          results.push({
            userId: user.id,
            status: 'skipped',
            reason: 'DSR already exists',
            dsrId: existingDSR.id,
          });
          continue;
        }

        // Gather data for DSR
        const startDate = dayjs(date).startOf('day').toDate();
        const endDate = dayjs(date).endOf('day').toDate();

        // Get tasks updated/created on this date
        const tasks = await prisma.task.findMany({
          where: {
            assignedToId: user.id,
            OR: [
              { createdAt: { gte: startDate, lte: endDate } },
              { updatedAt: { gte: startDate, lte: endDate } },
            ],
          },
          select: {
            title: true,
            status: true,
            description: true,
          },
        });

        // Get WhatsApp conversations (if opted in)
        const conversations = user.optIn
          ? await prisma.whatsAppConversation.findMany({
              where: {
                contact: { userId: user.id },
                messages: {
                  some: {
                    timestamp: { gte: startDate, lte: endDate },
                  },
                },
              },
              include: {
                contact: true,
                messages: {
                  where: {
                    timestamp: { gte: startDate, lte: endDate },
                  },
                  orderBy: { timestamp: 'desc' },
                  take: 1,
                },
                _count: {
                  select: {
                    messages: {
                      where: {
                        timestamp: { gte: startDate, lte: endDate },
                      },
                    },
                  },
                },
              },
            })
          : [];

        // Build DSR input
        const dsrInput: DSRInput = {
          userId: user.id,
          userName: user.name,
          date,
          tasks: tasks.map((t) => ({
            title: t.title,
            status: t.status,
            description: t.description || undefined,
          })),
          conversations: conversations.map((c) => ({
            contactName: c.contact.name || c.contact.phoneNumber,
            messageCount: c._count.messages,
            lastMessage: c.messages[0]?.text || 'Media message',
            timestamp: dayjs(c.messages[0]?.timestamp).format('HH:mm'),
          })),
        };

        // Generate summary using Gemini
        const llmResponse = await geminiClient.generateDSRSummary(dsrInput);

        // Save DSR
        const dsr = existingDSR
          ? await prisma.dSR.update({
              where: { id: existingDSR.id },
              data: {
                rawInputs: JSON.stringify(dsrInput),
                summary: llmResponse.summary,
                llmModel: llmResponse.model,
                status: llmResponse.success ? 'published' : 'draft',
                errorMessage: llmResponse.error || null,
                updatedAt: new Date(),
              },
            })
          : await prisma.dSR.create({
              data: {
                userId: user.id,
                date: new Date(date),
                rawInputs: JSON.stringify(dsrInput),
                summary: llmResponse.summary,
                llmModel: llmResponse.model,
                status: llmResponse.success ? 'published' : 'draft',
                errorMessage: llmResponse.error || null,
              },
            });

        // Create notification for user
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'dsr_ready',
            title: 'Daily Status Report Ready',
            message: `Your DSR for ${date} has been generated.`,
            payload: JSON.stringify({ dsrId: dsr.id }),
          },
        });

        // Audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'dsr_generated',
            resource: 'dsr',
            resourceId: dsr.id,
            metadata: JSON.stringify({
              date,
              llmSuccess: llmResponse.success,
              model: llmResponse.model,
            }),
          },
        });

        results.push({
          userId: user.id,
          status: 'success',
          dsrId: dsr.id,
          llmSuccess: llmResponse.success,
        });
      } catch (error: any) {
        console.error(`Error generating DSR for user ${user.id}:`, error);
        results.push({
          userId: user.id,
          status: 'error',
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        status: 'completed',
        date,
        processedUsers: results.length,
        results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in DSR generation endpoint:', error);

    await prisma.auditLog.create({
      data: {
        action: 'dsr_generation_error',
        resource: 'dsr',
        metadata: JSON.stringify({ error: error.message }),
      },
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
