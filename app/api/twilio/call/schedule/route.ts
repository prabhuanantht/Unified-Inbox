import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, text, scheduledFor } = await req.json();

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (!scheduledFor) {
      return NextResponse.json({ error: 'scheduledFor is required' }, { status: 400 });
    }

    const scheduleDate = new Date(scheduledFor);
    if (isNaN(scheduleDate.getTime())) {
      return NextResponse.json({ error: 'scheduledFor must be a valid date' }, { status: 400 });
    }

    // Create a Message row that our scheduler can pick up.
    // We use channel SMS as a placeholder and flag voiceCall in metadata.
    // The scheduler will detect metadata.voiceCall and place a Twilio call with TTS instead of sending SMS.
    const message = await prisma.message.create({
      data: {
        contactId,
        userId: session.user.id,
        channel: 'SMS',
        direction: 'OUTBOUND',
        content: text.trim(),
        status: 'SCHEDULED',
        scheduledFor: scheduleDate,
        metadata: { voiceCall: true, callType: 'SCHEDULED' },
        mediaUrls: [],
      },
    });

    return NextResponse.json({ success: true, id: message.id });
  } catch (error) {
    console.error('Error scheduling TTS call:', error);
    return NextResponse.json({ error: 'Failed to schedule call' }, { status: 500 });
  }
}


