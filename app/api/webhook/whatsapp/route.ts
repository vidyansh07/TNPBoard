import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { whatsappClient } from '@/lib/whatsapp';

/**
 * GET handler for WhatsApp webhook verification (Meta Cloud API)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode') || '';
  const token = searchParams.get('hub.verify_token') || '';
  const challenge = searchParams.get('hub.challenge') || '';

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return NextResponse.json({ error: 'Verify token not configured' }, { status: 500 });
  }

  // Verify webhook with Meta
  const challengeResponse = whatsappClient.verifyWebhook(
    { mode, token, challenge },
    verifyToken
  );

  if (challengeResponse) {
    // Log verification event
    await prisma.auditLog.create({
      data: {
        action: 'webhook_verified',
        resource: 'whatsapp',
        metadata: JSON.stringify({ mode, token: '***' }),
      },
    });

    return new NextResponse(challengeResponse, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST handler for incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log incoming webhook
    await prisma.auditLog.create({
      data: {
        action: 'webhook_received',
        resource: 'whatsapp',
        metadata: JSON.stringify(body),
      },
    });

    // Parse incoming message
    const incomingMessage = whatsappClient.parseIncomingMessage(body);

    if (!incomingMessage) {
      console.log('No message parsed from webhook payload');
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const { messageId, from, to, text, mediaUrl, mediaType, timestamp, metadata } =
      incomingMessage;

    // Find or create contact
    let contact = await prisma.whatsAppContact.findUnique({
      where: { phoneNumber: from },
    });

    if (!contact) {
      contact = await prisma.whatsAppContact.create({
        data: {
          phoneNumber: from,
          optIn: false, // Require explicit opt-in
        },
      });
    }

    // Find or create conversation
    let conversation = await prisma.whatsAppConversation.findFirst({
      where: { contactId: contact.id },
      orderBy: { lastMessageAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.whatsAppConversation.create({
        data: {
          contactId: contact.id,
          lastMessageAt: timestamp,
        },
      });
    } else {
      // Update last message timestamp
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      });
    }

    // Save message
    const savedMessage = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        fromNumber: from,
        toNumber: to,
        text,
        mediaUrl,
        mediaType,
        messageId,
        timestamp,
        direction: 'IN',
        status: 'DELIVERED',
        metadata: JSON.stringify(metadata),
      },
    });

    // If contact has opt-in and is linked to a user, create notification
    if (contact.optIn && contact.userId) {
      await prisma.notification.create({
        data: {
          userId: contact.userId,
          type: 'message_received',
          title: 'New WhatsApp Message',
          message: text || 'Media message received',
          payload: JSON.stringify({
            messageId: savedMessage.id,
            conversationId: conversation.id,
            from,
          }),
        },
      });
    }

    console.log(`Message saved: ${messageId} from ${from}`);

    return NextResponse.json(
      {
        status: 'success',
        messageId: savedMessage.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing webhook:', error);

    // Log error
    await prisma.auditLog.create({
      data: {
        action: 'webhook_error',
        resource: 'whatsapp',
        metadata: JSON.stringify({ error: error.message, stack: error.stack }),
      },
    });

    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
