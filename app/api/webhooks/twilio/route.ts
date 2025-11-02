import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import twilio from 'twilio';

/**
 * POST /api/webhooks/twilio - Handle incoming Twilio messages
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const numMedia = parseInt(formData.get('NumMedia') as string || '0');

    // Determine channel
    const isWhatsApp = from.startsWith('whatsapp:');
    const channel = isWhatsApp ? 'WHATSAPP' : 'SMS';

    // Clean phone number
    const phoneNumber = from.replace('whatsapp:', '');

    // Find or create contact
    let contact = await prisma.contact.findFirst({
      where: { phone: phoneNumber },
    });

    if (!contact) {
      // Create contact for first user (in production, handle this better)
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json({ error: 'No users found' }, { status: 500 });
      }

      contact = await prisma.contact.create({
        data: {
          phone: phoneNumber,
          name: phoneNumber,
          userId: firstUser.id,
        },
      });
    }

    // Handle media attachments
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string;
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    // Create message
    await prisma.message.create({
      data: {
        contactId: contact.id,
        userId: contact.userId,
        channel,
        direction: 'INBOUND',
        content: body || '',
        status: 'DELIVERED',
        mediaUrls,
        metadata: { twilioSid: messageSid },
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'MESSAGE_RECEIVED',
        entityType: 'MESSAGE',
        entityId: messageSid,
        metadata: { channel, from: phoneNumber },
      },
    });

    // Respond with TwiML
    const twiml = new twilio.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
