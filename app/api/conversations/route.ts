import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/conversations - Get all conversations
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    
    const where: any = {};
    if (contactId) {
      where.contactId = contactId;
    }
    
    const conversations = await prisma.whatsAppConversation.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            optIn: true
          }
        },
        messages: {
          take: 1,
          orderBy: { timestamp: 'desc' },
          select: {
            text: true,
            timestamp: true,
            direction: true
          }
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      }
    });
    
    // Add message count to each conversation
    const conversationsWithCount = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await prisma.whatsAppMessage.count({
          where: { conversationId: conv.id }
        });
        
        return {
          ...conv,
          messageCount,
          lastMessage: conv.messages[0] || null
        };
      })
    );
    
    return NextResponse.json({ conversations: conversationsWithCount });
  } catch (error: any) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: error.status || 500 }
    );
  }
}
