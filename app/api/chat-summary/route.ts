import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

// GET /api/chat-summary - Get chat summaries
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    const where: any = {};
    if (conversationId) {
      where.conversationId = conversationId;
    }

    const summaries = await prisma.chatSummary.findMany({
      where,
      orderBy: { generatedAt: 'desc' },
    });

    return NextResponse.json(summaries);
  } catch (error) {
    console.error('Chat summary fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
  }
}

// POST /api/chat-summary - Generate chat summary
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, startDate, endDate } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    // Fetch conversation and messages
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: {
        contact: true,
        messages: {
          where: {
            ...(startDate && endDate && {
              timestamp: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }),
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.messages.length === 0) {
      return NextResponse.json({ error: 'No messages to summarize' }, { status: 400 });
    }

    // Check if summary already exists
    const existingSummary = await prisma.chatSummary.findUnique({
      where: { conversationId },
    });

    // Prepare conversation text for AI
    const conversationText = conversation.messages
      .map((msg) => {
        const direction = msg.direction === 'IN' ? 'HR' : 'You';
        return `[${direction}]: ${msg.text || '[Media]'}`;
      })
      .join('\n');

    // Generate summary using Gemini AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return dummy summary if API key not configured
      const dummySummary = await generateDummySummary(conversation, conversationText);
      
      if (existingSummary) {
        const updated = await prisma.chatSummary.update({
          where: { conversationId },
          data: dummySummary,
        });
        return NextResponse.json(updated);
      } else {
        const created = await prisma.chatSummary.create({
          data: {
            conversationId,
            ...dummySummary,
          },
        });
        return NextResponse.json(created, { status: 201 });
      }
    }

    // Real AI summary
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Analyze this WhatsApp conversation with an HR representative and provide:
1. A concise summary (2-3 paragraphs)
2. Key topics discussed (as a comma-separated list)
3. Action items or next steps (as a bulleted list)
4. Overall sentiment (positive/neutral/negative with a score from -1 to 1)

Conversation (${conversation.messages.length} messages):
${conversationText}

Format your response as JSON:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...],
  "actionItems": ["item1", "item2", ...],
  "sentiment": 0.5
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse AI response
    let aiData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // Fallback if JSON parsing fails
      aiData = {
        summary: text,
        keyTopics: [],
        actionItems: [],
        sentiment: 0,
      };
    }

    const summaryData = {
      contactName: conversation.contact.name || conversation.contact.phoneNumber,
      contactPhone: conversation.contact.phoneNumber,
      startDate: conversation.messages[0].timestamp,
      endDate: conversation.messages[conversation.messages.length - 1].timestamp,
      messageCount: conversation.messages.length,
      summary: aiData.summary || text,
      keyTopics: aiData.keyTopics || [],
      sentimentScore: aiData.sentiment || 0,
      actionItems: aiData.actionItems || [],
      llmModel: 'gemini-pro',
      generatedAt: new Date(),
    };

    if (existingSummary) {
      const updated = await prisma.chatSummary.update({
        where: { conversationId },
        data: summaryData,
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.chatSummary.create({
        data: {
          conversationId,
          ...summaryData,
        },
      });
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error('Chat summary generation error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}

// Dummy summary generator when API key is not configured
async function generateDummySummary(conversation: any, conversationText: string) {
  const messages = conversation.messages;
  const wordCount = conversationText.split(' ').length;
  
  return {
    contactName: conversation.contact.name || conversation.contact.phoneNumber,
    contactPhone: conversation.contact.phoneNumber,
    startDate: messages[0].timestamp,
    endDate: messages[messages.length - 1].timestamp,
    messageCount: messages.length,
    summary: `This conversation with ${conversation.contact.name || 'HR'} consisted of ${messages.length} messages exchanged over ${Math.ceil((messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime()) / (1000 * 60 * 60 * 24))} days. The conversation covered approximately ${wordCount} words discussing various placement-related topics including job opportunities, interview scheduling, and candidate qualifications. The interaction maintained a professional tone throughout.`,
    keyTopics: ['Placement Process', 'Interview Coordination', 'Job Opportunities', 'Candidate Requirements'],
    sentimentScore: 0.7,
    actionItems: [
      'Follow up on pending interview schedules',
      'Share updated candidate profiles with HR',
      'Confirm job posting requirements',
      'Schedule next coordination meeting'
    ],
    llmModel: 'dummy-generator',
    generatedAt: new Date(),
  };
}
