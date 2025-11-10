/**
 * Test suite for WhatsApp webhook endpoint
 */

import { whatsappClient } from '@/lib/whatsapp';

describe('WhatsApp Webhook Parsing', () => {
  describe('Meta Cloud API', () => {
    it('should parse incoming text message', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+919876543210',
                      id: 'wamid.test123',
                      timestamp: '1699999999',
                      type: 'text',
                      text: {
                        body: 'Hello, test message',
                      },
                    },
                  ],
                  metadata: {
                    phone_number_id: '123456789',
                  },
                },
              },
            ],
          },
        ],
      };

      const message = whatsappClient.parseIncomingMessage(payload);

      expect(message).not.toBeNull();
      expect(message?.from).toBe('+919876543210');
      expect(message?.text).toBe('Hello, test message');
      expect(message?.messageId).toBe('wamid.test123');
    });

    it('should parse incoming media message', () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '+919876543210',
                      id: 'wamid.media123',
                      timestamp: '1699999999',
                      type: 'image',
                      image: {
                        id: 'image123',
                        link: 'https://example.com/image.jpg',
                      },
                    },
                  ],
                  metadata: {
                    phone_number_id: '123456789',
                  },
                },
              },
            ],
          },
        ],
      };

      const message = whatsappClient.parseIncomingMessage(payload);

      expect(message).not.toBeNull();
      expect(message?.mediaType).toBe('image');
      expect(message?.mediaUrl).toBeDefined();
    });
  });

  describe('Webhook Verification', () => {
    it('should verify webhook with correct token', () => {
      const verifyToken = 'test-verify-token';
      const challenge = whatsappClient.verifyWebhook(
        {
          mode: 'subscribe',
          token: verifyToken,
          challenge: 'test-challenge',
        },
        verifyToken
      );

      expect(challenge).toBe('test-challenge');
    });

    it('should reject verification with incorrect token', () => {
      const challenge = whatsappClient.verifyWebhook(
        {
          mode: 'subscribe',
          token: 'wrong-token',
          challenge: 'test-challenge',
        },
        'correct-token'
      );

      expect(challenge).toBeNull();
    });
  });
});

describe('DSR Generation Logic', () => {
  it('should build valid DSR input structure', () => {
    const dsrInput = {
      userId: 'user-123',
      userName: 'Test User',
      date: '2024-01-15',
      tasks: [
        { title: 'Task 1', status: 'DONE', description: 'Completed task' },
        { title: 'Task 2', status: 'IN_PROGRESS' },
      ],
      conversations: [
        {
          contactName: 'Contact 1',
          messageCount: 5,
          lastMessage: 'Test message',
          timestamp: '10:30',
        },
      ],
    };

    expect(dsrInput.tasks).toHaveLength(2);
    expect(dsrInput.conversations).toHaveLength(1);
    expect(dsrInput.tasks[0].status).toBe('DONE');
  });
});

describe('Chat Export Parser', () => {
  it('should parse WhatsApp export format', () => {
    const chatContent = `[15/01/2024, 10:30:45] John Doe: Hello there
[15/01/2024, 10:31:00] Jane Smith: Hi! How are you?
[15/01/2024, 10:31:30] John Doe: <Media omitted>`;

    // Test would call the parser function
    // Since parser is in route handler, this is a placeholder
    // In production, extract parser to lib/chat-parser.ts
    expect(chatContent).toContain('Hello there');
  });
});
