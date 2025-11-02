import { ChannelIntegration, SendParams, SendResult } from './base';

const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;
const accessToken = process.env.FACEBOOK_ACCESS_TOKEN; // Long-lived page access token

interface MetaMessage {
  id: string;
  from: { id: string; name?: string };
  message?: string;
  created_time: string;
  attachments?: { type: string; payload: { url?: string } }[];
}

export class MetaFacebookIntegration implements ChannelIntegration {
  private accessToken: string;

  constructor() {
    // Allow graceful failure if token not set (for testing)
    if (!accessToken) {
      console.warn('Facebook access token not configured. Set FACEBOOK_ACCESS_TOKEN in .env');
    }
    this.accessToken = accessToken || '';
  }

  /**
   * Fetch messages from Facebook Page inbox with pagination
   */
  async fetchMessages(limit: number = 1000): Promise<MetaMessage[]> {
    try {
      if (!this.accessToken) {
        console.warn('Facebook access token not set, skipping fetch');
        return [];
      }
      // First, get the page ID
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${this.accessToken}`
      );
      const pageData = await pageResponse.json();
      
      if (!pageData.data || pageData.data.length === 0) {
        console.error('No Facebook pages found');
        return [];
      }

      const pageId = pageData.data[0].id;
      const pageAccessToken = pageData.data[0].access_token;

      // Get ALL conversations with pagination
      const allMessages: MetaMessage[] = [];
      let nextUrl: string | null = `https://graph.facebook.com/v18.0/${pageId}/conversations?fields=messages{from,message,created_time,attachments},participants&limit=25&access_token=${pageAccessToken}`;
      let pageCount = 0;
      const maxPages = 100; // Safety limit

      while (nextUrl && pageCount < maxPages) {
        const conversationsResponse = await fetch(nextUrl);
        const conversationsData = await conversationsResponse.json();
        
        if (conversationsData.error) {
          console.error('Facebook API error:', conversationsData.error);
          break;
        }

        if (conversationsData.data) {
          for (const conversation of conversationsData.data) {
            // For each conversation, fetch ALL messages with pagination
            let messagesUrl = `https://graph.facebook.com/v18.0/${conversation.id}/messages?fields=from,message,created_time,attachments&limit=100&access_token=${pageAccessToken}`;
            let msgPageCount = 0;
            
            while (messagesUrl && msgPageCount < 50) {
              const msgsResponse = await fetch(messagesUrl);
              const msgsData = await msgsResponse.json();
              
              if (msgsData.error) break;
              
              if (msgsData.data) {
                for (const msg of msgsData.data) {
                  // Ensure we have a valid sender
                  const sender = conversation.participants?.data?.find((p: any) => p.id !== pageId) || msg.from;
                  if (sender && msg.message) {
                    allMessages.push({
                      ...msg,
                      from: sender,
                    });
                  }
                }
              }

              // Check for next page
              messagesUrl = msgsData.paging?.next || null;
              msgPageCount++;
              
              if (allMessages.length >= limit) break;
            }
            
            if (allMessages.length >= limit) break;
          }
        }

        // Check for next page of conversations
        nextUrl = conversationsData.paging?.next || null;
        pageCount++;
        
        if (allMessages.length >= limit) break;
      }

      console.log(`Fetched ${allMessages.length} Facebook messages`);
      return allMessages.sort((a, b) => 
        new Date(b.created_time).getTime() - new Date(a.created_time).getTime()
      );
    } catch (error) {
      console.error('Error fetching Facebook messages:', error);
      return [];
    }
  }

  /**
   * Send message via Facebook Messenger
   */
  async send(params: SendParams): Promise<SendResult> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Facebook access token not configured. Add FACEBOOK_ACCESS_TOKEN to .env' };
      }
      // Get page access token
      const pageResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${this.accessToken}`
      );
      const pageData = await pageResponse.json();
      
      if (!pageData.data || pageData.data.length === 0) {
        return { success: false, error: 'No Facebook pages found' };
      }

      const pageAccessToken = pageData.data[0].access_token;
      const pageId = pageData.data[0].id;

      // Find conversation with recipient (recipient ID should be provided as PSID)
      // The recipient should be the Facebook PSID (Page-Scoped ID) from the contact
      const recipientId = params.to;
      
      if (!recipientId) {
        return { success: false, error: 'Recipient ID (PSID) is required' };
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: params.content },
            access_token: pageAccessToken,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error) {
      console.error('Meta Facebook send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Setup webhook for Facebook Messenger
   */
  async setupWebhook(): Promise<void> {
    // Webhook setup is done through Facebook Developer Console
    console.log('Configure webhook in Facebook Developer Console:');
    console.log('Callback URL: https://your-domain.com/api/webhooks/facebook');
    console.log('Verify Token: (use your secret)');
  }
}

export class MetaInstagramIntegration implements ChannelIntegration {
  private accessToken: string;

  constructor() {
    // Allow graceful failure if token not set (for testing)
    if (!accessToken) {
      console.warn('Instagram access token not configured. Set FACEBOOK_ACCESS_TOKEN in .env');
    }
    this.accessToken = accessToken || '';
  }

  /**
   * Fetch messages from Instagram Direct with pagination
   */
  async fetchMessages(limit: number = 1000): Promise<any[]> {
    try {
      if (!this.accessToken) {
        console.warn('Instagram access token not set, skipping fetch');
        return [];
      }
      // Get Instagram Business Account ID
      const accountResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${this.accessToken}`
      );
      const accountData = await accountResponse.json();
      
      if (!accountData.data || accountData.data.length === 0) {
        return [];
      }

      // Get Instagram Business Account connected to the page
      const pageId = accountData.data[0].id;
      const igAccountResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${this.accessToken}`
      );
      const igAccountData = await igAccountResponse.json();

      if (!igAccountData.instagram_business_account?.id) {
        console.error('No Instagram Business Account found');
        return [];
      }

      const igAccountId = igAccountData.instagram_business_account.id;
      
      // Get page access token for Instagram
      const pageAccessToken = accountData.data[0].access_token;

      // Get ALL conversations with pagination
      const allMessages: any[] = [];
      let nextUrl: string | null = `https://graph.facebook.com/v18.0/${igAccountId}/conversations?fields=messages{from,text,timestamp,media_url}&limit=25&access_token=${pageAccessToken}`;
      let pageCount = 0;
      const maxPages = 100;

      while (nextUrl && pageCount < maxPages) {
        const conversationsResponse = await fetch(nextUrl);
        const conversationsData = await conversationsResponse.json();
        
        if (conversationsData.error) {
          console.error('Instagram API error:', conversationsData.error);
          break;
        }

        if (conversationsData.data) {
          for (const conversation of conversationsData.data) {
            // Fetch ALL messages from each conversation with pagination
            let messagesUrl = `https://graph.facebook.com/v18.0/${conversation.id}/messages?fields=from,text,timestamp,media_url&limit=100&access_token=${pageAccessToken}`;
            let msgPageCount = 0;
            
            while (messagesUrl && msgPageCount < 50) {
              const msgsResponse = await fetch(messagesUrl);
              const msgsData = await msgsResponse.json();
              
              if (msgsData.error) break;
              
              if (msgsData.data) {
                allMessages.push(...msgsData.data);
              }

              messagesUrl = msgsData.paging?.next || null;
              msgPageCount++;
              
              if (allMessages.length >= limit) break;
            }
            
            if (allMessages.length >= limit) break;
          }
        }

        nextUrl = conversationsData.paging?.next || null;
        pageCount++;
        
        if (allMessages.length >= limit) break;
      }

      console.log(`Fetched ${allMessages.length} Instagram messages`);
      return allMessages.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp * 1000).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp * 1000).getTime() : 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error fetching Instagram messages:', error);
      return [];
    }
  }

  async send(params: SendParams): Promise<SendResult> {
    try {
      if (!this.accessToken) {
        return { success: false, error: 'Instagram access token not configured. Add FACEBOOK_ACCESS_TOKEN to .env' };
      }
      // Get Instagram Business Account ID
      const accountResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${this.accessToken}`
      );
      const accountData = await accountResponse.json();
      
      if (!accountData.data || accountData.data.length === 0) {
        return { success: false, error: 'No Facebook pages found' };
      }

      const pageId = accountData.data[0].id;
      
      // Get Instagram Business Account connected to the page
      const igAccountResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account&access_token=${this.accessToken}`
      );
      const igAccountData = await igAccountResponse.json();

      if (!igAccountData.instagram_business_account?.id) {
        return { success: false, error: 'No Instagram Business Account found' };
      }

      const igAccountId = igAccountData.instagram_business_account.id;
      const recipientId = params.to;

      if (!recipientId) {
        return { success: false, error: 'Recipient ID is required' };
      }

      // Send message via Instagram Direct API
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${igAccountId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: params.content },
            access_token: this.accessToken,
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        return { success: false, error: result.error.message };
      }

      return {
        success: true,
        messageId: result.message_id || result.id,
      };
    } catch (error) {
      console.error('Meta Instagram send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

