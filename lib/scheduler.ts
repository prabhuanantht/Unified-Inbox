import cron from 'node-cron';
import { prisma } from './prisma';
import { createSender } from './integrations';

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
      include: {
        contact: true,
      },
    });

    console.log(`Processing ${scheduledMessages.length} scheduled messages`);

    for (const message of scheduledMessages) {
      try {
        // Determine recipient
        let recipient = '';
        if (message.channel === 'SMS' || message.channel === 'WHATSAPP') {
          recipient = message.contact.phone || '';
        } else if (message.channel === 'EMAIL') {
          recipient = message.contact.email || '';
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

        // Send message
        const sender = createSender(message.channel);
        const result = await sender.send({
          to: recipient,
          content: message.content,
          mediaUrls: message.mediaUrls,
        });

        if (result.success) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              metadata: { externalId: result.messageId },
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
