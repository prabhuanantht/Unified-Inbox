import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { messageSchema } from '@/lib/validations';
import { createSender } from '@/lib/integrations';
import { z } from 'zod';

/**
 * GET /api/messages - Fetch messages
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');
    const channel = searchParams.get('channel');
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const allMessages = searchParams.get('all') === 'true'; // Allow fetching all messages

    const where: any = {};
    
    // Only filter by userId if not requesting all messages
    if (!allMessages) {
      // Try to find messages with this userId, or any userId if no messages exist
      const userMessageCount = await prisma.message.count({
        where: { userId },
      });
      
      if (userMessageCount === 0) {
        // If no messages for this user, show all messages (useful for development)
        console.log('No messages found for userId:', userId, '- showing all messages');
      } else {
        where.userId = userId;
      }
    }
    
    if (contactId) {
      where.contactId = contactId;
    }
    
    if (channel) {
      // Validate channel is a valid enum value to prevent Prisma errors
      const validChannels = ['SMS', 'WHATSAPP', 'EMAIL', 'TWITTER', 'FACEBOOK', 'INSTAGRAM', 'SLACK'];
      if (validChannels.includes(channel.toUpperCase())) {
        where.channel = channel.toUpperCase() as any;
      } else {
        return NextResponse.json(
          { error: `Invalid channel: ${channel}. Valid channels are: ${validChannels.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Determine sort order: ascending for contact threads (chat view), descending for unified feed
    const orderBy = contactId ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy,
      take: 500, // Increased limit to show more old messages
    });

    console.log(`Fetched ${messages.length} messages`);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/messages?contactId={id} - Delete all messages for a contact
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      );
    }

    // Verify contact exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Delete all messages for this contact
    const result = await prisma.message.deleteMany({
      where: { contactId },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
    });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json(
      { error: 'Failed to delete messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages - Send a new message
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = messageSchema.parse(body);

    // Get contact details
    const contact = await prisma.contact.findUnique({
      where: { id: validatedData.contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Use the contact's userId (which exists) instead of temp-user-id
    const userId = contact.userId;

    // Verify user exists (should always be true, but double-check)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If user doesn't exist, get or create the first user
      let firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        firstUser = await prisma.user.create({
          data: {
            email: 'system@example.com',
            name: 'System User',
          },
        });
      }
      // Update contact to use the correct userId
      await prisma.contact.update({
        where: { id: contact.id },
        data: { userId: firstUser.id },
      });
      return NextResponse.json(
        { error: 'User not found, please try again' },
        { status: 400 }
      );
    }

    // Determine recipient based on channel
    let recipient = '';
    if (validatedData.channel === 'SMS' || validatedData.channel === 'WHATSAPP') {
      recipient = contact.phone || '';
    } else if (validatedData.channel === 'EMAIL') {
      recipient = contact.email || '';
    } else if (validatedData.channel === 'FACEBOOK') {
      // For Facebook, use the PSID from socialHandles
      const socialHandles = contact.socialHandles as any;
      recipient = socialHandles?.facebook || socialHandles?.psid || '';
    } else if (validatedData.channel === 'TWITTER') {
      const socialHandles = contact.socialHandles as any;
      recipient = socialHandles?.twitter || '';
    } else if (validatedData.channel === 'INSTAGRAM') {
      const socialHandles = contact.socialHandles as any;
      recipient = socialHandles?.instagram || '';
    } else if (validatedData.channel === 'SLACK') {
      const socialHandles = contact.socialHandles as any;
      recipient = socialHandles?.slack || '';
    }

    if (!recipient) {
      return NextResponse.json(
        { error: 'Contact does not have required contact info for this channel' },
        { status: 400 }
      );
    }

    // Parse scheduledFor if it's a string
    let scheduledForDate: Date | undefined = undefined;
    if (validatedData.scheduledFor) {
      scheduledForDate = typeof validatedData.scheduledFor === 'string' 
        ? new Date(validatedData.scheduledFor)
        : validatedData.scheduledFor;
    }

    // Create message in database
    const message = await prisma.message.create({
      data: {
        contactId: validatedData.contactId,
        channel: validatedData.channel,
        content: validatedData.content || '',
        mediaUrls: validatedData.mediaUrls || [],
        userId: user.id, // Use verified user.id
        senderId: user.id,
        direction: 'OUTBOUND',
        status: scheduledForDate ? 'SCHEDULED' : 'PENDING',
        scheduledFor: scheduledForDate,
      },
    });

    // Send immediately if not scheduled
    if (!scheduledForDate) {
      try {
        const sender = createSender(validatedData.channel);
        
        // Prepare send params with email-specific fields
        const sendParams: any = {
          to: recipient,
          content: validatedData.content,
          mediaUrls: validatedData.mediaUrls,
        };

        // Handle email replies
        if (validatedData.channel === 'EMAIL' && validatedData.replyToMessageId) {
          const originalMessage = await prisma.message.findUnique({
            where: { id: validatedData.replyToMessageId },
          });
          if (originalMessage?.metadata) {
            const meta = originalMessage.metadata as any;
            sendParams.subject = meta.emailSubject 
              ? (meta.emailSubject.startsWith('Re:') ? meta.emailSubject : `Re: ${meta.emailSubject}`)
              : 'Re: Message';
            sendParams.replyTo = meta.emailMessageId || originalMessage.id;
          }
        }

        const result = await sender.send(sendParams);

        if (result.success) {
          await prisma.message.update({
            where: { id: message.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              metadata: { externalId: result.messageId },
            },
          });
        } else {
          console.error('Message send failed:', result.error);
          await prisma.message.update({
            where: { id: message.id },
            data: { 
              status: 'FAILED', 
              metadata: { 
                error: result.error,
                timestamp: new Date().toISOString(),
              },
            },
          });
          // Return error to user
          return NextResponse.json(
            { 
              error: result.error || 'Failed to send message',
              messageId: message.id,
            },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            metadata: { 
              error: errorMessage,
              timestamp: new Date().toISOString(),
            },
          },
        });
        // Return error to user
        return NextResponse.json(
          { 
            error: `Failed to send message: ${errorMessage}`,
            messageId: message.id,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}
