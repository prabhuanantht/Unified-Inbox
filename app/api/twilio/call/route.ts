import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    const { to: toInput, text, contactId } = await req.json();

    // Resolve destination number
    let to = toInput as string | undefined;
    if (!to && contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { phone: true },
      });
      to = contact?.phone || undefined;
    }

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Initiate an outbound phone call using Twilio's Calls API.
    // This will place a call from your Twilio number to the provided destination
    // and play a short message to confirm the call is functional.
    // You can replace the inline TwiML with a public URL to your own TwiML if desired.
    const safeText = (typeof text === 'string' && text.trim().length > 0)
      ? text.trim()
      : 'This is a test call from Unified Inbox. Your outbound calling is working.';

    const twiml = `<Response><Say voice="alice">${safeText.replace(/[<>]/g, '')}</Say></Response>`;

    const call = await client.calls.create({
      to,
      from: phoneNumber,
      twiml,
    });

    console.log(`Call initiated. SID: ${call.sid} from ${phoneNumber} to ${to}`);
    
    // Log a message in the thread if contactId and user present
    if (contactId && session?.user?.id) {
      try {
        await prisma.message.create({
          data: {
            contactId,
            userId: session.user.id,
            channel: 'SMS',
            direction: 'OUTBOUND',
            content: safeText,
            status: 'SENT',
            metadata: { voiceCall: true, callSid: call.sid, callType: 'IMMEDIATE' },
            mediaUrls: [],
          },
        });
      } catch (e) {
        console.error('Failed to log call message:', e);
      }
    }

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      to,
      from: phoneNumber,
      message: 'Call initiated successfully',
    });
  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json(
      { error: 'Failed to initiate call' },
      { status: 500 }
    );
  }
}

