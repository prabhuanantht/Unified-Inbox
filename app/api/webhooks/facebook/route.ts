import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'your-verify-token-here';

/**
 * GET /api/webhooks/facebook - Webhook verification (required by Facebook)
 * Facebook sends a GET request with hub.verify_token and hub.challenge to verify your webhook
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Verify the webhook subscription
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }

    // Respond with '403 Forbidden' if verify tokens do not match
    console.error('Webhook verification failed');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('Facebook webhook verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

/**
 * POST /api/webhooks/facebook - Handle incoming messages from Facebook/Instagram
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Facebook sends a challenge verification on first setup, handle it
    if (body.object === 'page' || body.object === 'instagram') {
      // Handle page subscription
      if (body.entry) {
        for (const entry of body.entry) {
          // Handle messaging events
          if (entry.messaging) {
            for (const event of entry.messaging) {
              await handleMessagingEvent(event, body.object === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK');
            }
          }

          // Handle Instagram messaging events
          if (entry.messaging && body.object === 'instagram') {
            for (const event of entry.messaging) {
              await handleMessagingEvent(event, 'INSTAGRAM');
            }
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Facebook webhook error:', error);
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

async function handleMessagingEvent(event: any, channel: 'FACEBOOK' | 'INSTAGRAM') {
  try {
    // Only process incoming messages
    if (!event.message || event.message.is_echo) {
      return;
    }

    const senderId = event.sender?.id;
    const messageId = event.message?.mid || event.message?.id;
    const messageText = event.message?.text;
    const timestamp = event.timestamp ? new Date(event.timestamp * 1000) : new Date();

    if (!senderId || !messageText) {
      return;
    }

    // Get or create user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'webhook@example.com',
          name: 'Webhook User',
        },
      });
    }

    // Find or create contact
    const socialHandleField = channel === 'FACEBOOK' ? 'facebook' : 'instagram';
    let contact = await prisma.contact.findFirst({
      where: {
        socialHandles: { path: [socialHandleField], equals: senderId },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: user.id,
          name: `${channel} User ${senderId}`,
          socialHandles: { [socialHandleField]: senderId },
        },
      });
    }

    // Check if message already exists (prevent duplicates)
    const existing = await prisma.message.findFirst({
      where: {
        contactId: contact.id,
        metadata: {
          path: channel === 'FACEBOOK' ? ['facebookId'] : ['instagramId'],
          equals: messageId,
        },
      },
    });

    if (!existing) {
      // Handle attachments/media
      const mediaUrls: string[] = [];
      if (event.message.attachments) {
        for (const attachment of event.message.attachments) {
          if (attachment.payload?.url) {
            mediaUrls.push(attachment.payload.url);
          }
        }
      }

      await prisma.message.create({
        data: {
          contactId: contact.id,
          userId: user.id,
          channel,
          direction: 'INBOUND',
          content: messageText,
          status: 'DELIVERED',
          mediaUrls,
          metadata: {
            [channel === 'FACEBOOK' ? 'facebookId' : 'instagramId']: messageId,
          },
          sentAt: timestamp,
          createdAt: timestamp,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          action: 'MESSAGE_RECEIVED',
          entityType: 'MESSAGE',
          entityId: messageId || '',
          metadata: { channel, from: senderId },
        },
      });
    }
  } catch (error) {
    console.error(`Error handling ${channel} messaging event:`, error);
  }
}

