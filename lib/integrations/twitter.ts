import { ChannelIntegration, SendParams, SendResult } from './base';

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const bearerToken = process.env.TWITTER_BEARER_TOKEN;

interface TwitterMessage {
  id: string;
  text: string;
  created_at: string;
  sender_id?: string;
  recipient_id?: string;
  attachments?: { media?: { media_url_https?: string }[] };
}

export class TwitterIntegration implements ChannelIntegration {
  private bearerToken: string;

  constructor() {
    // Allow graceful failure if token not set
    if (!bearerToken) {
      console.warn('Twitter Bearer Token not configured. Set TWITTER_BEARER_TOKEN in .env');
    }
    this.bearerToken = bearerToken || '';
  }

  /**
   * Fetch messages from Twitter DMs with pagination
   */
  async fetchMessages(limit: number = 1000): Promise<TwitterMessage[]> {
    try {
      if (!this.bearerToken) {
        console.warn('Twitter bearer token not set, skipping fetch');
        return [];
      }
      // Get user's ID first
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        console.error('Error getting Twitter user:', errorText);
        return [];
      }

      const meData = await meResponse.json();
      const userId = meData.data?.id;

      if (!userId) {
        console.error('Could not get Twitter user ID');
        return [];
      }

      // Get ALL DM conversations with pagination
      // Note: Twitter API v2 DMs require elevated access, this might fail without it
      const allMessages: TwitterMessage[] = [];
      let nextToken: string | null = null;
      let pageCount = 0;
      const maxPages = 100;

      while (pageCount < maxPages && allMessages.length < limit) {
        let url = `https://api.twitter.com/2/dm_conversations/with/${userId}/dm_events?max_results=100`;
        if (nextToken) {
          url += `&pagination_token=${nextToken}`;
        }

        const dmsResponse = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        });

        if (!dmsResponse.ok) {
          const errorText = await dmsResponse.text();
          if (dmsResponse.status === 403 || dmsResponse.status === 401) {
            console.warn('Twitter DMs require elevated access or OAuth. Bearer token may be read-only.');
          }
          break;
        }

        const dmsData = await dmsResponse.json();
        
        if (dmsData.errors) {
          console.error('Twitter API errors:', dmsData.errors);
          break;
        }

        if (dmsData.data) {
          const messages = dmsData.data.map((msg: any) => ({
            id: msg.id,
            text: msg.text || msg.dm_event?.text || '',
            created_at: msg.created_at || msg.dm_event?.created_at || new Date().toISOString(),
            sender_id: msg.sender_id || msg.dm_event?.sender_id,
            recipient_id: msg.recipient_id || msg.dm_event?.recipient_id,
          }));
          allMessages.push(...messages);
        }

        // Check for pagination token
        nextToken = dmsData.meta?.next_token || null;
        if (!nextToken) break;

        pageCount++;
      }

      console.log(`Fetched ${allMessages.length} Twitter messages`);
      return allMessages.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error fetching Twitter messages:', error);
      return [];
    }
  }

  /**
   * Send DM via Twitter API
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      if (!this.bearerToken) {
        return { success: false, error: 'Twitter Bearer Token not configured. Add TWITTER_BEARER_TOKEN to .env' };
      }
      // Get user's ID first
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        return { success: false, error: `Failed to get user: ${errorText}` };
      }

      const meData = await meResponse.json();
      const userId = meData.data?.id;

      if (!userId) {
        return { success: false, error: 'Could not get Twitter user ID' };
      }

      // For Twitter DMs, we need OAuth 1.0a with user context
      // For now, using Bearer Token (read-only), but sending requires OAuth
      // This is a simplified implementation - production needs OAuth 1.0a
      
      // Get recipient user ID from username or ID
      const recipientId = params.to;

      const response = await fetch(
        `https://api.twitter.com/2/dm_conversations/with/${recipientId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: params.content,
          }),
        }
      );

      const result = await response.json();

      if (result.errors || !response.ok) {
        return {
          success: false,
          error: result.errors?.[0]?.message || 'Failed to send Twitter DM. Note: Sending DMs requires OAuth 1.0a authentication with user context, not just Bearer Token.',
        };
      }

      return {
        success: true,
        messageId: result.data?.id || result.id,
      };
    } catch (error) {
      console.error('Twitter send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error. Note: Twitter DM sending requires OAuth 1.0a authentication.',
      };
    }
  }

  /**
   * Setup webhook for Twitter DMs
   */
  async setupWebhook(): Promise<void> {
    console.log('Twitter webhook setup:');
    console.log('1. Go to Twitter Developer Portal');
    console.log('2. Set up Account Activity API');
    console.log('3. Configure webhook URL: https://your-domain.com/api/webhooks/twitter');
  }
}

