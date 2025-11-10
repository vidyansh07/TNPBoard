import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parse } from 'path';

/**
 * POST /api/upload-chat
 * 
 * Upload exported WhatsApp chat text file
 * Parses and imports messages into the system
 * Requires explicit user confirmation before saving
 * 
 * Body (multipart/form-data):
 *   file: WhatsApp exported chat .txt file
 *   userId: User ID to associate with this chat
 *   phoneNumber: Contact phone number
 *   confirm: boolean (must be true to save)
 */

interface ParsedMessage {
  timestamp: Date;
  sender: string;
  text: string;
  mediaType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const confirm = formData.get('confirm') === 'true';

    if (!file || !userId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: file, userId, phoneNumber' },
        { status: 400 }
      );
    }

    // Verify user exists and has opted in
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.optIn) {
      return NextResponse.json(
        { error: 'User must opt-in before uploading personal chats' },
        { status: 403 }
      );
    }

    // Read file content
    const content = await file.text();
    const parsedMessages = parseWhatsAppExport(content);

    if (parsedMessages.length === 0) {
      return NextResponse.json(
        { error: 'No valid messages found in the uploaded file' },
        { status: 400 }
      );
    }

    // Return preview if not confirmed
    if (!confirm) {
      return NextResponse.json({
        preview: true,
        messageCount: parsedMessages.length,
        dateRange: {
          start: parsedMessages[0].timestamp,
          end: parsedMessages[parsedMessages.length - 1].timestamp,
        },
        sampleMessages: parsedMessages.slice(0, 5),
        instructions: 'Set confirm=true to import these messages',
      });
    }

    // Find or create contact
    let contact = await prisma.whatsAppContact.findUnique({
      where: { phoneNumber },
    });

    if (!contact) {
      contact = await prisma.whatsAppContact.create({
        data: {
          phoneNumber,
          userId: user.id,
          optIn: true,
          optInDate: new Date(),
        },
      });
    } else if (!contact.userId) {
      // Link contact to user
      await prisma.whatsAppContact.update({
        where: { id: contact.id },
        data: { userId: user.id },
      });
    }

    // Create conversation
    const conversation = await prisma.whatsAppConversation.create({
      data: {
        contactId: contact.id,
        lastMessageAt: parsedMessages[parsedMessages.length - 1].timestamp,
      },
    });

    // Batch insert messages
    const messagesToInsert = parsedMessages.map((msg, index) => ({
      conversationId: conversation.id,
      fromNumber: msg.sender === 'You' ? user.phone || phoneNumber : phoneNumber,
      toNumber: msg.sender === 'You' ? phoneNumber : user.phone || phoneNumber,
      text: msg.text,
      mediaType: msg.mediaType,
      messageId: `imported_${conversation.id}_${index}`,
      timestamp: msg.timestamp,
      direction: msg.sender === 'You' ? 'OUT' : 'IN',
      status: 'DELIVERED',
      metadata: JSON.stringify({ source: 'upload', filename: file.name }),
    }));

    await prisma.whatsAppMessage.createMany({
      data: messagesToInsert as any,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'chat_imported',
        resource: 'whatsapp',
        resourceId: conversation.id,
        metadata: JSON.stringify({
          filename: file.name,
          messageCount: parsedMessages.length,
          phoneNumber,
        }),
      },
    });

    return NextResponse.json({
      status: 'success',
      conversationId: conversation.id,
      messagesImported: parsedMessages.length,
    });
  } catch (error: any) {
    console.error('Error uploading chat:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse WhatsApp exported chat format
 * Supports multiple date/time formats
 */
function parseWhatsAppExport(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const lines = content.split('\n');

  // Common WhatsApp export patterns
  const patterns = [
    // [DD/MM/YYYY, HH:MM:SS] Sender: Message
    /^\[(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.+)$/,
    // DD/MM/YYYY, HH:MM - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)$/,
    // MM/DD/YYYY, HH:MM - Sender: Message
    /^(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2})\s-\s([^:]+):\s(.+)$/,
  ];

  for (const line of lines) {
    if (!line.trim()) continue;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          const [, dateStr, timeStr, sender, messageText] = match;
          
          // Parse date (handle DD/MM/YYYY format)
          const [day, month, year] = dateStr.split('/').map(Number);
          const [hours, minutes, seconds = 0] = timeStr.split(':').map(Number);
          
          const timestamp = new Date(year, month - 1, day, hours, minutes, seconds);

          // Check for media attachments
          let text = messageText;
          let mediaType: string | undefined;

          if (messageText.includes('<Media omitted>') || messageText.includes('<attached>')) {
            text = '[Media file]';
            mediaType = 'document';
          } else if (messageText.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
            mediaType = 'image';
          } else if (messageText.match(/\.(mp4|mov|avi)/i)) {
            mediaType = 'video';
          } else if (messageText.match(/\.(mp3|wav|ogg)/i)) {
            mediaType = 'audio';
          }

          messages.push({
            timestamp,
            sender: sender.trim(),
            text,
            mediaType,
          });
        } catch (e) {
          console.error('Error parsing line:', line, e);
        }
        break;
      }
    }
  }

  return messages;
}
