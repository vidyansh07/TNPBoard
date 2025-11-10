import axios, { AxiosInstance } from 'axios';

/**
 * WhatsApp Provider Interface
 * Supports both Meta Cloud API and Twilio
 */

export type WhatsAppProvider = 'meta' | 'twilio';

export interface WhatsAppMessagePayload {
  to: string; // E.164 format
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
}

export interface WhatsAppIncomingMessage {
  messageId: string;
  from: string;
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppVerificationParams {
  mode: string;
  token: string;
  challenge: string;
}

/**
 * Meta Cloud API WhatsApp Client
 */
class MetaWhatsAppClient {
  private client: AxiosInstance;
  private phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.phoneNumberId = phoneNumberId;
    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v18.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: payload.to,
    };

    if (payload.text) {
      body.type = 'text';
      body.text = { body: payload.text };
    } else if (payload.mediaUrl && payload.mediaType) {
      body.type = payload.mediaType;
      body[payload.mediaType] = { link: payload.mediaUrl };
    }

    const response = await this.client.post(`/${this.phoneNumberId}/messages`, body);
    return { messageId: response.data.messages[0].id };
  }

  verifyWebhook(params: WhatsAppVerificationParams, verifyToken: string): string | null {
    if (params.mode === 'subscribe' && params.token === verifyToken) {
      return params.challenge;
    }
    return null;
  }

  parseIncomingMessage(payload: any): WhatsAppIncomingMessage | null {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];

      if (!message) return null;

      const from = message.from;
      const messageId = message.id;
      const timestamp = new Date(parseInt(message.timestamp) * 1000);

      let text: string | undefined;
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (message.type === 'text') {
        text = message.text?.body;
      } else if (['image', 'video', 'audio', 'document'].includes(message.type)) {
        mediaType = message.type;
        mediaUrl = message[message.type]?.link || message[message.type]?.id;
      }

      return {
        messageId,
        from,
        to: change?.value?.metadata?.phone_number_id || '',
        text,
        mediaUrl,
        mediaType,
        timestamp,
        metadata: { rawPayload: message },
      };
    } catch (error) {
      console.error('Error parsing Meta webhook:', error);
      return null;
    }
  }
}

/**
 * Twilio WhatsApp Client
 */
class TwilioWhatsAppClient {
  private client: AxiosInstance;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.fromNumber = fromNumber;
    this.client = axios.create({
      baseURL: `https://api.twilio.com/2010-04-01/Accounts/${accountSid}`,
      auth: {
        username: accountSid,
        password: authToken,
      },
    });
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<{ messageId: string }> {
    const params = new URLSearchParams({
      From: `whatsapp:${this.fromNumber}`,
      To: `whatsapp:${payload.to}`,
      Body: payload.text || '',
    });

    if (payload.mediaUrl) {
      params.append('MediaUrl', payload.mediaUrl);
    }

    const response = await this.client.post('/Messages.json', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return { messageId: response.data.sid };
  }

  parseIncomingMessage(payload: any): WhatsAppIncomingMessage | null {
    try {
      const from = payload.From?.replace('whatsapp:', '') || '';
      const to = payload.To?.replace('whatsapp:', '') || '';
      const text = payload.Body || '';
      const messageId = payload.MessageSid || '';
      const timestamp = new Date();

      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (payload.MediaUrl0) {
        mediaUrl = payload.MediaUrl0;
        mediaType = payload.MediaContentType0?.split('/')[0]; // Extract type from MIME
      }

      return {
        messageId,
        from,
        to,
        text,
        mediaUrl,
        mediaType,
        timestamp,
        metadata: { rawPayload: payload },
      };
    } catch (error) {
      console.error('Error parsing Twilio webhook:', error);
      return null;
    }
  }
}

/**
 * WhatsApp Client Factory
 */
export class WhatsAppClient {
  private provider: WhatsAppProvider;
  private client: MetaWhatsAppClient | TwilioWhatsAppClient;

  constructor() {
    this.provider = (process.env.WHATSAPP_PROVIDER as WhatsAppProvider) || 'meta';

    if (this.provider === 'meta') {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
      this.client = new MetaWhatsAppClient(accessToken, phoneNumberId);
    } else {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER!;
      this.client = new TwilioWhatsAppClient(accountSid, authToken, fromNumber);
    }
  }

  async sendMessage(payload: WhatsAppMessagePayload): Promise<{ messageId: string }> {
    return this.client.sendMessage(payload);
  }

  parseIncomingMessage(payload: any): WhatsAppIncomingMessage | null {
    return this.client.parseIncomingMessage(payload);
  }

  verifyWebhook(
    params: WhatsAppVerificationParams,
    verifyToken: string
  ): string | null {
    if (this.client instanceof MetaWhatsAppClient) {
      return this.client.verifyWebhook(params, verifyToken);
    }
    // Twilio uses different verification mechanism (signature validation)
    return null;
  }

  getProvider(): WhatsAppProvider {
    return this.provider;
  }
}

export const whatsappClient = new WhatsAppClient();
