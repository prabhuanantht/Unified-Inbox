import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!SLACK_SIGNING_SECRET) {
    console.warn('SLACK_SIGNING_SECRET not set, skipping signature verification');
    return true; // Allow in development if secret not set
  }

  const sigBaseString = `v0:${timestamp}:${body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', SLACK_SIGNING_SECRET)
      .update(sigBaseString)
      .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

/**
 * POST /api/webhooks/slack - Handle incoming Slack events
 */
export async function POST(req: NextRequest) {
  try {
    // Verify signature
    const timestamp = req.headers.get('x-slack-request-timestamp') || '';
    const signature = req.headers.get('x-slack-signature') || '';
    const body = await req.text();

    // Check timestamp (prevent replay attacks)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - requestTime) > 300) {
      return NextResponse.json({ error: 'Request timestamp too old' }, { status: 400 });
    }

    // Verify signature
    if (!verifySlackSignature(timestamp, body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle URL verification challenge
    if (event.type === 'url_verification') {
      return NextResponse.json({ challenge: event.challenge });
    }

    // Handle event callbacks
    if (event.type === 'event_callback') {
      const slackEvent = event.event;

      // Only process message events
      if (slackEvent.type === 'message' && !slackEvent.subtype) {
        await handleSlackMessage(slackEvent);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Slack webhook error:', error);
    return NextResponse.json({ success: false }, { status: 200 }); // Always return 200 to Slack
  }
}

async function handleSlackMessage(event: any) {
  try {
    const userId = event.user;
    const channelId = event.channel;
    const messageText = event.text;
    const timestamp = event.ts;
    const threadTs = event.thread_ts;

    if (!userId || !messageText) {
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

    // Get user info from Slack API to get better name
    let slackUserName = `Slack User ${userId}`;
    try {
      const slackIntegration = (await import('@/lib/integrations/slack')).SlackIntegration;
      const slack = new slackIntegration();
      const userInfo = await slack.getUserInfo(userId);
      if (userInfo) {
        slackUserName = userInfo.name;
      }
    } catch (error) {
      console.error('Error fetching Slack user info:', error);
    }

    // Find or create contact using Slack user ID
    let contact = await prisma.contact.findFirst({
      where: {
        socialHandles: { path: ['slack'], equals: userId },
      },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: user.id,
          name: slackUserName,
          email: undefined, // Could fetch from Slack API
          socialHandles: { slack: userId },
        },
      });
    }

    // Check if message already exists (prevent duplicates)
    const existing = await prisma.message.findFirst({
      where: {
        contactId: contact.id,
        metadata: { path: ['slackTs'], equals: timestamp },
      },
    });

    if (!existing) {
      // Handle attachments/files
      const mediaUrls: string[] = [];
      if (event.files) {
        for (const file of event.files) {
          if (file.url_private) {
            mediaUrls.push(file.url_private);
          }
        }
      }

      await prisma.message.create({
        data: {
          contactId: contact.id,
          userId: user.id,
          channel: 'SLACK',
          direction: 'INBOUND',
          content: messageText,
          status: 'DELIVERED',
          mediaUrls,
          metadata: {
            slackTs: timestamp,
            slackChannel: channelId,
            slackThreadTs: threadTs,
          },
          sentAt: new Date(parseFloat(timestamp) * 1000),
          createdAt: new Date(parseFloat(timestamp) * 1000),
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          action: 'MESSAGE_RECEIVED',
          entityType: 'MESSAGE',
          entityId: timestamp,
          metadata: { channel: 'SLACK', from: userId, channelId },
        },
      });
    }
  } catch (error) {
    console.error('Error handling Slack message:', error);
  }
}

