import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/webhooks/resend - Handle incoming emails from Resend
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Resend sends webhook events
    if (body.type === 'email.received' || body.type === 'email.delivered') {
      const email = body.data;
      
      // Handle inbound email
      if (body.type === 'email.received' && email.from && email.text) {
        await handleInboundEmail(email);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json({ success: false }, { status: 200 }); // Always return 200
  }
}

async function handleInboundEmail(email: any) {
  try {
    const fromEmail = email.from?.email || email.from;
    const subject = email.subject || 'No Subject';
    const text = email.text || email.html || '';
    const date = email.date ? new Date(email.date) : new Date();
    const messageId = email.message_id || email.id;

    if (!fromEmail) {
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
    let contact = await prisma.contact.findFirst({
      where: { email: fromEmail },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          userId: user.id,
          name: email.from?.name || fromEmail.split('@')[0],
          email: fromEmail,
        },
      });
    }

    // Check if message already exists
    const existing = await prisma.message.findFirst({
      where: {
        contactId: contact.id,
        metadata: { path: ['emailMessageId'], equals: messageId },
      },
    });

    if (!existing) {
      await prisma.message.create({
        data: {
          contactId: contact.id,
          userId: user.id,
          channel: 'EMAIL',
          direction: 'INBOUND',
          content: `${subject}\n\n${text}`,
          status: 'DELIVERED',
          metadata: {
            emailMessageId: messageId,
            emailSubject: subject,
            emailInReplyTo: email.in_reply_to,
            emailReferences: email.references,
          },
          sentAt: date,
          createdAt: date,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          action: 'MESSAGE_RECEIVED',
          entityType: 'MESSAGE',
          entityId: messageId || '',
          metadata: { channel: 'EMAIL', from: fromEmail },
        },
      });
    }
  } catch (error) {
    console.error('Error handling inbound email:', error);
  }
}

