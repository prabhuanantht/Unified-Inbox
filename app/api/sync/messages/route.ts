import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TwilioSMSIntegration, TwilioWhatsAppIntegration } from '@/lib/integrations/twilio';
import { MetaFacebookIntegration, MetaInstagramIntegration } from '@/lib/integrations/meta';
import { TwitterIntegration } from '@/lib/integrations/twitter';
import { SlackIntegration } from '@/lib/integrations/slack';
import { EmailIntegration } from '@/lib/integrations/email';

/**
 * POST /api/sync/messages - Sync messages from all connected channels
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channels, limit = 10000 } = body; // Fetch up to 10,000 messages per channel for full history
    const userId = req.headers.get('x-user-id') || 'temp-user-id';

    // Get or create user
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'sync@example.com',
          name: 'Sync User',
        },
      });
    }

    const syncedMessages: any[] = [];
    const errors: string[] = [];

    // Sync Twilio SMS
    if (!channels || channels.includes('SMS')) {
      try {
        const smsIntegration = new TwilioSMSIntegration();
        const messages = await smsIntegration.fetchMessages(limit);

        for (const msg of messages) {
          // Find or create contact
          let contact = await prisma.contact.findFirst({
            where: { phone: msg.from },
          });

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                userId: user.id,
                phone: msg.from,
                name: msg.from,
              },
            });
          }

          // Check if message already exists
          const existing = await prisma.message.findFirst({
            where: {
              contactId: contact.id,
              metadata: { path: ['twilioSid'], equals: msg.id },
            },
          });

          if (!existing) {
            const isInbound = msg.direction === 'inbound';
            // For inbound messages, they're already received, so mark as DELIVERED
            // For outbound messages, map Twilio status to our status
            let messageStatus: string;
            if (isInbound) {
              messageStatus = 'DELIVERED';
            } else {
              // Map Twilio outbound statuses
              const twilioStatus = (msg.status || '').toLowerCase();
              if (twilioStatus === 'delivered') {
                messageStatus = 'DELIVERED';
              } else if (twilioStatus === 'sent') {
                messageStatus = 'SENT';
              } else if (twilioStatus === 'failed' || twilioStatus === 'undelivered') {
                messageStatus = 'FAILED';
              } else if (twilioStatus === 'queued' || twilioStatus === 'sending') {
                messageStatus = 'PENDING';
              } else {
                messageStatus = 'SENT'; // Default for outbound
              }
            }

            const message = await prisma.message.create({
              data: {
                contactId: contact.id,
                userId: user.id,
                channel: 'SMS',
                direction: isInbound ? 'INBOUND' : 'OUTBOUND',
                content: msg.body || '',
                status: messageStatus as any,
                mediaUrls: msg.mediaUrls || [],
                metadata: { twilioSid: msg.id },
                sentAt: msg.dateSent ? new Date(msg.dateSent) : new Date(),
                createdAt: msg.dateSent ? new Date(msg.dateSent) : new Date(),
                deliveredAt: isInbound && messageStatus === 'DELIVERED' ? (msg.dateSent ? new Date(msg.dateSent) : new Date()) : undefined,
              },
            });
            syncedMessages.push(message);
          }
        }
      } catch (error) {
        errors.push(`SMS sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Twilio WhatsApp
    if (!channels || channels.includes('WHATSAPP')) {
      try {
        const whatsappIntegration = new TwilioWhatsAppIntegration();
        const messages = await whatsappIntegration.fetchMessages(limit);

        for (const msg of messages) {
          let contact = await prisma.contact.findFirst({
            where: { phone: msg.from },
          });

          if (!contact) {
            contact = await prisma.contact.create({
              data: {
                userId: user.id,
                phone: msg.from,
                name: msg.from,
              },
            });
          }

          const existing = await prisma.message.findFirst({
            where: {
              contactId: contact.id,
              metadata: { path: ['twilioSid'], equals: msg.id },
            },
          });

          if (!existing) {
            const isInbound = msg.direction === 'inbound';
            // For inbound messages, they're already received, so mark as DELIVERED
            // For outbound messages, map Twilio status to our status
            let messageStatus: string;
            if (isInbound) {
              messageStatus = 'DELIVERED';
            } else {
              // Map Twilio outbound statuses
              const twilioStatus = (msg.status || '').toLowerCase();
              if (twilioStatus === 'delivered') {
                messageStatus = 'DELIVERED';
              } else if (twilioStatus === 'sent') {
                messageStatus = 'SENT';
              } else if (twilioStatus === 'failed' || twilioStatus === 'undelivered') {
                messageStatus = 'FAILED';
              } else if (twilioStatus === 'queued' || twilioStatus === 'sending') {
                messageStatus = 'PENDING';
              } else {
                messageStatus = 'SENT'; // Default for outbound
              }
            }

            const message = await prisma.message.create({
              data: {
                contactId: contact.id,
                userId: user.id,
                channel: 'WHATSAPP',
                direction: isInbound ? 'INBOUND' : 'OUTBOUND',
                content: msg.body || '',
                status: messageStatus as any,
                mediaUrls: msg.mediaUrls || [],
                metadata: { twilioSid: msg.id },
                sentAt: msg.dateSent ? new Date(msg.dateSent) : new Date(),
                createdAt: msg.dateSent ? new Date(msg.dateSent) : new Date(),
                deliveredAt: isInbound && messageStatus === 'DELIVERED' ? (msg.dateSent ? new Date(msg.dateSent) : new Date()) : undefined,
              },
            });
            syncedMessages.push(message);
          }
        }
      } catch (error) {
        errors.push(`WhatsApp sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Facebook Messages
    if (!channels || channels.includes('FACEBOOK')) {
      try {
        if (process.env.FACEBOOK_ACCESS_TOKEN) {
          const fbIntegration = new MetaFacebookIntegration();
          const messages = await fbIntegration.fetchMessages(limit);

          for (const msg of messages) {
            // Use sender ID as identifier
            const senderId = msg.from.id;
            let contact = await prisma.contact.findFirst({
              where: {
                socialHandles: { path: ['facebook'], equals: senderId },
              },
            });

            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  userId: user.id,
                  name: msg.from.name || `Facebook User ${senderId}`,
                  socialHandles: { facebook: senderId },
                },
              });
            }

            const existing = await prisma.message.findFirst({
              where: {
                contactId: contact.id,
                metadata: { path: ['facebookId'], equals: msg.id },
              },
            });

            if (!existing && msg.message) {
              const message = await prisma.message.create({
                data: {
                  contactId: contact.id,
                  userId: user.id,
                  channel: 'FACEBOOK',
                  direction: 'INBOUND',
                  content: msg.message,
                  status: 'DELIVERED',
                  metadata: { facebookId: msg.id },
                  sentAt: new Date(msg.created_time),
                  createdAt: new Date(msg.created_time),
                },
              });
              syncedMessages.push(message);
            }
          }
        }
      } catch (error) {
        errors.push(`Facebook sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Instagram Messages
    if (!channels || channels.includes('INSTAGRAM')) {
      try {
        if (process.env.FACEBOOK_ACCESS_TOKEN) {
          const igIntegration = new MetaInstagramIntegration();
          const messages = await igIntegration.fetchMessages(limit);

          for (const msg of messages) {
            const senderId = msg.from?.id;
            if (!senderId) continue;

            let contact = await prisma.contact.findFirst({
              where: {
                socialHandles: { path: ['instagram'], equals: senderId },
              },
            });

            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  userId: user.id,
                  name: `Instagram User ${senderId}`,
                  socialHandles: { instagram: senderId },
                },
              });
            }

            const existing = await prisma.message.findFirst({
              where: {
                contactId: contact.id,
                metadata: { path: ['instagramId'], equals: msg.id },
              },
            });

            if (!existing && msg.text) {
              const message = await prisma.message.create({
                data: {
                  contactId: contact.id,
                  userId: user.id,
                  channel: 'INSTAGRAM',
                  direction: 'INBOUND',
                  content: msg.text,
                  status: 'DELIVERED',
                  mediaUrls: msg.media_url ? [msg.media_url] : [],
                  metadata: { instagramId: msg.id },
                  sentAt: new Date(msg.timestamp * 1000),
                  createdAt: new Date(msg.timestamp * 1000),
                },
              });
              syncedMessages.push(message);
            }
          }
        }
      } catch (error) {
        errors.push(`Instagram sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Twitter Messages
    if (!channels || channels.includes('TWITTER')) {
      try {
        if (process.env.TWITTER_BEARER_TOKEN) {
          const twitterIntegration = new TwitterIntegration();
          const messages = await twitterIntegration.fetchMessages(limit);

          for (const msg of messages) {
            const senderId = msg.sender_id;
            if (!senderId) continue;

            let contact = await prisma.contact.findFirst({
              where: {
                socialHandles: { path: ['twitter'], equals: senderId },
              },
            });

            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  userId: user.id,
                  name: `Twitter User ${senderId}`,
                  socialHandles: { twitter: senderId },
                },
              });
            }

            const existing = await prisma.message.findFirst({
              where: {
                contactId: contact.id,
                metadata: { path: ['twitterId'], equals: msg.id },
              },
            });

            if (!existing && msg.text) {
              const message = await prisma.message.create({
                data: {
                  contactId: contact.id,
                  userId: user.id,
                  channel: 'TWITTER',
                  direction: 'INBOUND',
                  content: msg.text,
                  status: 'DELIVERED',
                  metadata: { twitterId: msg.id },
                  sentAt: new Date(msg.created_at),
                  createdAt: new Date(msg.created_at),
                },
              });
              syncedMessages.push(message);
            }
          }
        }
      } catch (error) {
        errors.push(`Twitter sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Email Messages
    if (!channels || channels.includes('EMAIL')) {
      try {
        if (process.env.IMAP_USER && process.env.IMAP_PASSWORD) {
          const emailIntegration = new EmailIntegration();
          const messages = await emailIntegration.fetchMessages(limit);

          for (const msg of messages) {
            const senderEmail = msg.from;
            if (!senderEmail) continue;

            let contact = await prisma.contact.findFirst({
              where: { email: senderEmail },
            });

            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  userId: user.id,
                  name: senderEmail.split('@')[0],
                  email: senderEmail,
                },
              });
            }

            const existing = await prisma.message.findFirst({
              where: {
                contactId: contact.id,
                metadata: { path: ['emailMessageId'], equals: msg.messageId || msg.uid.toString() },
              },
            });

            if (!existing && msg.text) {
              const message = await prisma.message.create({
                data: {
                  contactId: contact.id,
                  userId: user.id,
                  channel: 'EMAIL',
                  direction: 'INBOUND',
                  content: msg.subject ? `${msg.subject}\n\n${msg.text}` : msg.text,
                  status: 'DELIVERED',
                  metadata: {
                    emailMessageId: msg.messageId || msg.uid.toString(),
                    emailSubject: msg.subject,
                    emailInReplyTo: msg.inReplyTo,
                    emailReferences: msg.references,
                  },
                  sentAt: new Date(msg.date),
                  createdAt: new Date(msg.date),
                },
              });
              syncedMessages.push(message);
            }
          }
        }
      } catch (error) {
        errors.push(`Email sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sync Slack Messages
    if (!channels || channels.includes('SLACK')) {
      try {
        if (process.env.SLACK_BOT_TOKEN) {
          const slackIntegration = new SlackIntegration();
          const messages = await slackIntegration.fetchMessages(limit);

          for (const msg of messages) {
            const senderId = msg.user;
            if (!senderId) continue;

            let contact = await prisma.contact.findFirst({
              where: {
                socialHandles: { path: ['slack'], equals: senderId },
              },
            });

            if (!contact) {
              // Try to get user name from Slack
              let userName = `Slack User ${senderId}`;
              try {
                const userInfo = await slackIntegration.getUserInfo(senderId);
                if (userInfo) {
                  userName = userInfo.name;
                }
              } catch (error) {
                // Use default name if fetch fails
              }

              contact = await prisma.contact.create({
                data: {
                  userId: user.id,
                  name: userName,
                  socialHandles: { slack: senderId },
                },
              });
            }

            const existing = await prisma.message.findFirst({
              where: {
                contactId: contact.id,
                metadata: { path: ['slackTs'], equals: msg.id },
              },
            });

            if (!existing && msg.text) {
              const message = await prisma.message.create({
                data: {
                  contactId: contact.id,
                  userId: user.id,
                  channel: 'SLACK',
                  direction: 'INBOUND',
                  content: msg.text,
                  status: 'DELIVERED',
                  mediaUrls: msg.files?.map((f: any) => f.url_private || '').filter(Boolean) || [],
                  metadata: {
                    slackTs: msg.id,
                    slackChannel: msg.channel,
                    slackThreadTs: msg.thread_ts,
                  },
                  sentAt: new Date(msg.created_at),
                  createdAt: new Date(msg.created_at),
                },
              });
              syncedMessages.push(message);
            }
          }
        }
      } catch (error) {
        errors.push(`Slack sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncedMessages.length,
      messages: syncedMessages,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error syncing messages:', error);
    return NextResponse.json(
      { error: 'Failed to sync messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/messages - Get sync status
 */
export async function GET(req: NextRequest) {
    return NextResponse.json({
      message: 'Use POST to sync messages',
      availableChannels: ['SMS', 'WHATSAPP', 'EMAIL', 'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'SLACK'],
    });
}

