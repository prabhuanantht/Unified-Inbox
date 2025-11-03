import cron from 'node-cron';
import { prisma } from './prisma';
import { createSender } from './integrations';
import twilio from 'twilio';

/**
 * Process scheduled messages
 */
async function processScheduledMessages() {
  try {
    const now = new Date();

    const scheduledMessages = await prisma.message.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledFor: {
          lte: now,
        },
      },
      select: {
        id: true,
        contactId: true,
        userId: true,
        channel: true,
        direction: true,
        content: true,
        status: true,
        metadata: true,
        mediaUrls: true,
        scheduledFor: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`Processing ${scheduledMessages.length} scheduled messages`);

    for (const message of scheduledMessages) {
      try {
        // Load contact minimal fields on-demand to avoid selecting non-existent columns
        const contact = await prisma.contact.findUnique({
          where: { id: message.contactId },
          select: { phone: true, email: true, socialHandles: true },
        });

        // Determine recipient
        let recipient = '';
        if (message.channel === 'SMS' || message.channel === 'WHATSAPP') {
          recipient = contact?.phone || '';
        } else if (message.channel === 'EMAIL') {
          recipient = contact?.email || '';
        } else if (message.channel === 'FACEBOOK') {
          const socialHandles = contact?.socialHandles as any;
          recipient = socialHandles?.facebook || socialHandles?.psid || '';
        } else if (message.channel === 'TWITTER') {
          const socialHandles = contact?.socialHandles as any;
          recipient = socialHandles?.twitter || '';
        } else if (message.channel === 'INSTAGRAM') {
          const socialHandles = contact?.socialHandles as any;
          recipient = socialHandles?.instagram || '';
        } else if (message.channel === 'SLACK') {
          const socialHandles = contact?.socialHandles as any;
          recipient = socialHandles?.slack || '';
        }

        if (!recipient) {
          console.error(`No recipient found for message ${message.id}`);
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'FAILED',
              metadata: { error: 'No recipient found' },
            },
          });
          continue;
        }

        // If this is a scheduled voice call, place a Twilio call with TTS using message.content
        const isVoiceCall = Boolean((message.metadata as any)?.voiceCall);
        if (isVoiceCall) {
          const accountSid = process.env.TWILIO_ACCOUNT_SID;
          const authToken = process.env.TWILIO_AUTH_TOKEN;
          const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
          if (!accountSid || !authToken || !phoneNumber) {
            throw new Error('Twilio credentials not configured');
          }
          const client = twilio(accountSid, authToken);
          const safeText = message.content?.trim() || 'This is a scheduled call.';
          const twiml = `<Response><Say voice="alice">${safeText.replace(/[<>]/g, '')}</Say></Response>`;
          await client.calls.create({ to: recipient, from: phoneNumber, twiml });

          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'SENT', sentAt: new Date() },
          });
          console.log(`Scheduled voice call placed for message ${message.id}`);
          continue;
        }

        // Send message via channel integrations
        const sender = createSender(message.channel);
        
        // Prepare send params with email-specific fields from metadata
        const sendParams: any = {
          to: recipient,
          content: message.content,
          mediaUrls: message.mediaUrls,
        };

        // Handle email-specific fields from metadata
        if (message.channel === 'EMAIL' && message.metadata) {
          const meta = message.metadata as any;
          
          // Handle email replies - need to fetch original message
          if (meta.replyToMessageId) {
            const originalMessage = await prisma.message.findUnique({
              where: { id: meta.replyToMessageId },
            });
            if (originalMessage?.metadata) {
              const origMeta = originalMessage.metadata as any;
              sendParams.subject = origMeta.emailSubject 
                ? (origMeta.emailSubject.startsWith('Re:') ? origMeta.emailSubject : `Re: ${origMeta.emailSubject}`)
                : 'Re: Message';
              sendParams.replyTo = origMeta.emailMessageId || originalMessage.id;
            }
          } else if (meta.emailSubject) {
            // Use provided subject for new emails
            sendParams.subject = meta.emailSubject;
          }
        }

        const result = await sender.send(sendParams);

        if (result.success) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              metadata: { ...(message.metadata as any || {}), externalId: result.messageId },
            },
          });
          console.log(`Message ${message.id} sent successfully`);
        } else {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'FAILED',
              metadata: { error: result.error },
            },
          });
          console.error(`Message ${message.id} failed: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
          },
        });
      }
    }
  } catch (error) {
    console.error('Error in scheduled message processor:', error);
  }
}

/**
 * Start the scheduler
 */
export function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', processScheduledMessages);
  console.log('Message scheduler started');
}
