import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/conversations/[id] - Get a single conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: params.id },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            optIn: true,
            userId: true
          }
        },
        messages: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            text: true,
            mediaUrl: true,
            mediaType: true,
            direction: true,
            status: true,
            timestamp: true
          }
        }
      }
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversation' },
      { status: error.status || 500 }
    );
  }
}
