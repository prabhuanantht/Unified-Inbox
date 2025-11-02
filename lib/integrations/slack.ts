import { ChannelIntegration, SendParams, SendResult } from './base';

const botToken = process.env.SLACK_BOT_TOKEN;
const appToken = process.env.SLACK_APP_TOKEN;
const signingSecret = process.env.SLACK_SIGNING_SECRET;

interface SlackMessage {
  ts: string;
  text: string;
  user: string;
  channel: string;
  thread_ts?: string;
  files?: Array<{ url_private?: string; mimetype?: string }>;
}

interface SlackConversation {
  id: string;
  name?: string;
  is_im?: boolean;
  user?: string;
}

export class SlackIntegration implements ChannelIntegration {
  private botToken: string;
  private appToken?: string;
  private signingSecret?: string;

  constructor() {
    if (!botToken) {
      console.warn('Slack Bot Token not configured. Set SLACK_BOT_TOKEN in .env');
    }
    this.botToken = botToken || '';
    this.appToken = appToken;
    this.signingSecret = signingSecret;
  }

  /**
   * Fetch messages from Slack DMs and channels
   */
  async fetchMessages(limit: number = 1000): Promise<any[]> {
    try {
      if (!this.botToken) {
        console.warn('Slack bot token not set, skipping fetch');
        return [];
      }

      const allMessages: any[] = [];

      // Get all conversations (DMs and channels)
      const conversationsResponse = await fetch('https://slack.com/api/conversations.list?types=im,mpim&limit=1000', {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!conversationsResponse.ok) {
        console.error('Failed to fetch Slack conversations');
        return [];
      }

      const conversationsData = await conversationsResponse.json();
      
      if (!conversationsData.ok || !conversationsData.channels) {
        console.error('Slack API error:', conversationsData.error);
        return [];
      }

      const conversations: SlackConversation[] = conversationsData.channels;
      let messageCount = 0;

      // Fetch messages from each conversation
      for (const conversation of conversations) {
        if (messageCount >= limit) break;

        try {
          // Get conversation history with pagination
          let cursor: string | null = null;
          let pageCount = 0;
          const maxPages = 100;

          while (pageCount < maxPages && messageCount < limit) {
            let url = `https://slack.com/api/conversations.history?channel=${conversation.id}&limit=200`;
            if (cursor) {
              url += `&cursor=${cursor}`;
            }

            const messagesResponse = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${this.botToken}`,
                'Content-Type': 'application/json',
              },
            });

            if (!messagesResponse.ok) break;

            const messagesData = await messagesResponse.json();

            if (!messagesData.ok || !messagesData.messages) {
              break;
            }

            for (const msg of messagesData.messages) {
              if (messageCount >= limit) break;

              // Skip bot messages
              if (msg.subtype === 'bot_message') continue;

              allMessages.push({
                id: msg.ts,
                text: msg.text || '',
                created_at: new Date(parseFloat(msg.ts) * 1000).toISOString(),
                user: msg.user,
                channel: conversation.id,
                channel_name: conversation.name || conversation.user || 'Unknown',
                thread_ts: msg.thread_ts,
                files: msg.files || [],
              });

              messageCount++;
            }

            cursor = messagesData.response_metadata?.next_cursor || null;
            if (!cursor) break;
            pageCount++;
          }
        } catch (error) {
          console.error(`Error fetching messages for conversation ${conversation.id}:`, error);
          continue;
        }
      }

      console.log(`Fetched ${allMessages.length} Slack messages`);
      return allMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error fetching Slack messages:', error);
      return [];
    }
  }

  /**
   * Send message via Slack API
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      if (!this.botToken) {
        return { success: false, error: 'Slack Bot Token not configured. Add SLACK_BOT_TOKEN to .env' };
      }

      // The recipient should be a Slack user ID or channel ID
      const channelId = params.to;

      if (!channelId) {
        return { success: false, error: 'Channel ID or User ID is required' };
      }

      // Prepare message payload
      const payload: any = {
        channel: channelId,
        text: params.content,
      };

      // Add media if provided
      if (params.mediaUrls && params.mediaUrls.length > 0) {
        // For Slack, we need to upload files separately using files.upload
        // For now, include URLs in text
        payload.text += '\n' + params.mediaUrls.join('\n');
      }

      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.ok) {
        return {
          success: false,
          error: result.error || 'Failed to send Slack message',
        };
      }

      return {
        success: true,
        messageId: result.ts || result.message?.ts,
      };
    } catch (error) {
      console.error('Slack send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Setup webhook for Slack
   */
  async setupWebhook(): Promise<void> {
    console.log('Slack webhook setup:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Select your app → Event Subscriptions');
    console.log('3. Enable Events');
    console.log('4. Request URL: https://your-domain.com/api/webhooks/slack');
    console.log('5. Subscribe to: message.im, message.channels, message.groups');
  }

  /**
   * Get user info by user ID
   */
  async getUserInfo(userId: string): Promise<{ name: string; email?: string } | null> {
    try {
      if (!this.botToken) return null;

      const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.botToken}`,
        },
      });

      const result = await response.json();

      if (!result.ok || !result.user) {
        return null;
      }

      return {
        name: result.user.real_name || result.user.name || userId,
        email: result.user.profile?.email,
      };
    } catch (error) {
      console.error('Error fetching Slack user info:', error);
      return null;
    }
  }
}

