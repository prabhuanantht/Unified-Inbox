import twilio from 'twilio';
import { ChannelIntegration, SendParams, SendResult } from './base';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

export class TwilioSMSIntegration implements ChannelIntegration {
  private client: twilio.Twilio;

  constructor() {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Fetch historical SMS messages from Twilio with pagination
   */
  async fetchMessages(limit: number = 1000, dateAfter?: Date): Promise<any[]> {
    try {
      // Fetch ALL messages, not just recent ones
      // If no dateAfter, fetch from 1 year ago to get all historical messages
      const startDate = dateAfter || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      const allMessages: any[] = [];
      let hasMore = true;
      let currentLimit = limit;

      // Twilio paginates automatically, we need to fetch in batches
      while (hasMore && allMessages.length < limit) {
        const messages = await this.client.messages.list({
          to: phoneNumber,
          dateSentAfter: startDate,
          limit: Math.min(1000, currentLimit - allMessages.length), // Twilio max is 1000 per page
        });

        for (const msg of messages) {
          allMessages.push({
            id: msg.sid,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            dateSent: msg.dateSent,
            status: msg.status,
            direction: msg.direction,
            mediaUrls: msg.mediaUrl ? [msg.mediaUrl] : [],
          });
        }

        hasMore = messages.length === 1000 && allMessages.length < limit;
      }

      console.log(`Fetched ${allMessages.length} SMS messages`);
      return allMessages;
    } catch (error) {
      console.error('Error fetching Twilio SMS messages:', error);
      return [];
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      // Convert relative URLs to absolute URLs for local uploads
      const mediaUrls = params.mediaUrls?.map(url => {
        if (url.startsWith('/uploads/') || url.startsWith('/')) {
          // Convert to absolute URL
          const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
          return `${baseUrl}${url}`;
        }
        return url;
      });

      const message = await this.client.messages.create({
        body: params.content,
        from: params.from || phoneNumber,
        to: params.to,
        mediaUrl: mediaUrls,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('Twilio SMS send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export class TwilioWhatsAppIntegration implements ChannelIntegration {
  private client: twilio.Twilio;

  constructor() {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Fetch historical WhatsApp messages from Twilio with pagination
   */
  async fetchMessages(limit: number = 1000, dateAfter?: Date): Promise<any[]> {
    try {
      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
      // Fetch ALL messages, not just recent ones
      const startDate = dateAfter || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
      
      const allMessages: any[] = [];
      let hasMore = true;

      while (hasMore && allMessages.length < limit) {
        const messages = await this.client.messages.list({
          to: whatsappNumber,
          dateSentAfter: startDate,
          limit: Math.min(1000, limit - allMessages.length),
        });

        for (const msg of messages) {
          allMessages.push({
            id: msg.sid,
            from: msg.from?.replace('whatsapp:', ''),
            to: msg.to?.replace('whatsapp:', ''),
            body: msg.body,
            dateSent: msg.dateSent,
            status: msg.status,
            direction: msg.direction,
            mediaUrls: msg.mediaUrl ? [msg.mediaUrl] : [],
          });
        }

        hasMore = messages.length === 1000 && allMessages.length < limit;
      }

      console.log(`Fetched ${allMessages.length} WhatsApp messages`);
      return allMessages;
    } catch (error) {
      console.error('Error fetching Twilio WhatsApp messages:', error);
      return [];
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

      // Convert relative URLs to absolute URLs for local uploads
      const mediaUrls = params.mediaUrls?.map(url => {
        if (url.startsWith('/uploads/') || url.startsWith('/')) {
          // Convert to absolute URL
          const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
          return `${baseUrl}${url}`;
        }
        return url;
      });

      const message = await this.client.messages.create({
        body: params.content,
        from: whatsappNumber,
        to: `whatsapp:${params.to}`,
        mediaUrl: mediaUrls,
      });

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('Twilio WhatsApp send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
