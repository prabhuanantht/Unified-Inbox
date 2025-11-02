import { ChannelIntegration } from './base';
import { TwilioSMSIntegration, TwilioWhatsAppIntegration } from './twilio';
import { MetaFacebookIntegration, MetaInstagramIntegration } from './meta';
import { TwitterIntegration } from './twitter';
import { SlackIntegration } from './slack';
import { EmailIntegration } from './email';

/**
 * Factory function to create channel sender
 */
export function createSender(channel: string): ChannelIntegration {
  switch (channel.toUpperCase()) {
    case 'SMS':
      return new TwilioSMSIntegration();
    case 'WHATSAPP':
      return new TwilioWhatsAppIntegration();
    case 'EMAIL':
      return new EmailIntegration();
    case 'FACEBOOK':
      return new MetaFacebookIntegration();
    case 'INSTAGRAM':
      return new MetaInstagramIntegration();
    case 'TWITTER':
      return new TwitterIntegration();
    case 'SLACK':
      return new SlackIntegration();
    default:
      throw new Error(`Unsupported channel: ${channel}`);
  }
}

export * from './base';
export * from './twilio';
export * from './meta';
export * from './twitter';
export * from './slack';
export * from './email';
