/**
 * Base interface for channel integrations
 */
export interface ChannelIntegration {
  send(params: SendParams): Promise<SendResult>;
  setupWebhook?(): Promise<void>;
}

export interface SendParams {
  to: string;
  content: string;
  mediaUrls?: string[];
  from?: string;
  subject?: string;
  replyTo?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
