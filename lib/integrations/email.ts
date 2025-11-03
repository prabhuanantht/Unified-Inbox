import { ChannelIntegration, SendParams, SendResult } from './base';
import { Resend } from 'resend';
import imaps from 'imap-simple';
import { render } from '@react-email/render';
import { EmailTemplate } from '../../emails/email-template';

const resendApiKey = process.env.RESEND_API_KEY;
const imapConfig = {
  host: process.env.IMAP_HOST || 'imap.gmail.com',
  port: parseInt(process.env.IMAP_PORT || '993'),
  tls: process.env.IMAP_TLS !== 'false',
  user: process.env.IMAP_USER || '',
  password: process.env.IMAP_PASSWORD || '',
};

export class EmailIntegration implements ChannelIntegration {
  private resend: Resend | null;
  private imapConfig: typeof imapConfig;

  constructor() {
    if (!resendApiKey) {
      console.warn('Resend API key not configured. Set RESEND_API_KEY in .env');
      this.resend = null;
    } else {
      this.resend = new Resend(resendApiKey);
    }

    this.imapConfig = imapConfig;
  }

  /**
   * Fetch messages from email inbox using IMAP
   * Note: For better results, use Resend's inbound email webhooks instead of IMAP
   */
  async fetchMessages(limit: number = 1000): Promise<any[]> {
    try {
      if (!this.imapConfig.user || !this.imapConfig.password) {
        console.warn('IMAP credentials not configured. Set IMAP_USER and IMAP_PASSWORD in .env');
        console.warn('Alternatively, use Resend webhooks for receiving emails.');
        return [];
      }

      const config = {
        imap: {
          user: this.imapConfig.user,
          password: this.imapConfig.password,
          host: this.imapConfig.host,
          port: this.imapConfig.port,
          tls: this.imapConfig.tls,
          tlsOptions: { rejectUnauthorized: false },
        },
      };

      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');

      // Search for all messages
      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: 'HEADER',
        struct: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      
      // Limit to most recent
      const recentMessages = messages.slice(-limit);

      const allMessages: any[] = [];

      for (const msg of recentMessages) {
        try {
          // Get full message
          const fetchResult = await connection.fetch([msg.attributes.uid], {
            bodies: '',
            struct: true,
          });

          if (fetchResult && fetchResult.length > 0) {
            const fullMsg = fetchResult[0];
            const parts = imaps.getParts(fullMsg.parsedParts);
            const textPart = parts.find((part: any) => part.which === 'TEXT');
            const htmlPart = parts.find((part: any) => part.which === 'HTML');
            
            const headers = fullMsg.parts.filter((p: any) => p.which === 'HEADER')[0]?.body || {};
            
            const from = headers.from?.[0] || '';
            const to = headers.to?.[0] || '';
            const subject = headers.subject?.[0] || '';
            const date = msg.attributes.date ? new Date(msg.attributes.date) : new Date();
            const messageId = headers['message-id']?.[0] || '';
            const inReplyTo = headers['in-reply-to']?.[0] || '';
            const references = headers.references?.[0] || '';

            // Extract email address
            const extractEmail = (str: string): string => {
              if (!str) return '';
              const match = str.match(/<([^>]+)>/) || str.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
              return match ? match[1] : str.trim();
            };

            // Get body text
            let bodyText = '';
            if (textPart && textPart.body) {
              bodyText = Buffer.from(textPart.body, 'base64').toString('utf8');
            } else if (htmlPart && htmlPart.body) {
              // Strip HTML tags for text
              const html = Buffer.from(htmlPart.body, 'base64').toString('utf8');
              bodyText = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
            }

            allMessages.push({
              uid: msg.attributes.uid,
              date: date.toISOString(),
              from: extractEmail(from),
              to: extractEmail(to),
              subject,
              text: bodyText,
              messageId,
              inReplyTo,
              references,
            });
          }
        } catch (error) {
          console.error(`Error processing email message ${msg.attributes.uid}:`, error);
          continue;
        }
      }

      await connection.end();
      console.log(`Fetched ${allMessages.length} email messages`);
      return allMessages;
    } catch (error) {
      console.error('Error fetching emails via IMAP:', error);
      console.warn('Consider using Resend webhooks for receiving emails instead of IMAP.');
      return [];
    }
  }

  /**
   * Send email via Resend using React Email
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      if (!this.resend) {
        return {
          success: false,
          error: 'Resend API key not configured. Add RESEND_API_KEY to .env',
        };
      }

      // For free tier, use onboarding@resend.dev as sender
      // NOTE: onboarding@resend.dev can ONLY send to your own verified email address
      // To send to any recipient, verify a domain at https://resend.com/domains
      // and set RESEND_FROM_EMAIL to use your verified domain
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Parse recipient - could be "Name <email>" or just "email"
      let toEmail = params.to.includes('<') 
        ? params.to.match(/<([^>]+)>/)?.[1] || params.to 
        : params.to;
      
      toEmail = toEmail.trim();
      
      if (!emailRegex.test(toEmail)) {
        return {
          success: false,
          error: `Invalid recipient email address: ${toEmail}`,
        };
      }

      // Check if using free tier and validate recipient
      if (fromEmail === 'onboarding@resend.dev') {
        const verifiedEmail = process.env.RESEND_VERIFIED_EMAIL || '';
        if (!verifiedEmail) {
          console.warn('RESEND_VERIFIED_EMAIL not set. Add your Resend account email to .env for better validation.');
        } else if (toEmail.toLowerCase() !== verifiedEmail.toLowerCase()) {
          return {
            success: false,
            error: `Free tier limitation: With onboarding@resend.dev, you can only send to your verified email (${verifiedEmail}). You're trying to send to: ${toEmail}. To send to any recipient, verify a domain at https://resend.com/domains and set RESEND_FROM_EMAIL in your .env file.`,
          };
        }
      }

      // Use React Email to render HTML
      const emailHtml = await render(
        EmailTemplate({ 
          content: params.content || '', 
          mediaUrls: params.mediaUrls || [] 
        })
      );

      const emailData: any = {
        from: fromEmail,
        to: [toEmail],
        subject: params.subject || 'Message from Unified Inbox',
        html: emailHtml,
        text: params.content, // Plain text fallback
      };

      // Handle reply-to
      if (params.replyTo) {
        emailData.reply_to = params.replyTo;
        // Ensure subject has "Re:" prefix
        if (!emailData.subject.startsWith('Re:')) {
          emailData.subject = `Re: ${emailData.subject}`;
        }
      }

      console.log('Sending email via Resend:', { 
        from: fromEmail, 
        to: toEmail, 
        subject: emailData.subject,
        hasContent: !!params.content,
        hasSubject: !!params.subject,
      });
      
      const result = await this.resend.emails.send(emailData);

      if ('error' in result && result.error) {
        const error: any = result.error;
        console.error('Resend API error:', JSON.stringify(error, null, 2));
        
        // Handle different error types
        let errorMessage = 'Failed to send email';
        if (error?.message) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Provide helpful context for common errors
        if (errorMessage.includes('only send testing emails to your own email address') || 
            errorMessage.includes('verify a domain') ||
            errorMessage.includes('only send to your own email')) {
          // Free tier limitation - can only send to verified email
          errorMessage = `Free tier limitation: With onboarding@resend.dev, you can only send to your own verified email address (typically the one you used to sign up for Resend). To send to any recipient, please verify a domain at https://resend.com/domains and update RESEND_FROM_EMAIL in your .env file to use your verified domain (e.g., noreply@yourdomain.com).`;
        } else if (errorMessage.includes('domain') || errorMessage.includes('verification') || errorMessage.includes('not verified')) {
          errorMessage += '. To send emails, verify your domain at https://resend.com/domains';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
          errorMessage += '. Please check that the recipient email address is valid.';
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
          errorMessage += '. You may have exceeded your Resend quota. Check your Resend dashboard.';
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }
      
      console.log('Email sent successfully:', 'data' in result ? result.data?.id : 'unknown');

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('Email send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send email: ${errorMessage}`,
      };
    }
  }

  /**
   * Setup webhook for Resend inbound emails
   */
  async setupWebhook(): Promise<void> {
    console.log('Resend webhook setup:');
    console.log('1. Go to https://resend.com/webhooks');
    console.log('2. Add webhook URL: https://your-domain.com/api/webhooks/resend');
    console.log('3. Select event: email.received');
    console.log('Note: For receiving emails, you can also configure IMAP settings in .env');
  }
}
