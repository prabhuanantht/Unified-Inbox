import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/contacts - Fetch all contacts for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Get userId from session
    let userId = req.headers.get('x-user-id') || 'temp-user-id';

    // Get or create a valid user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If user doesn't exist, get or create the first user
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'system@example.com',
            name: 'System User',
          },
        });
      }
      userId = user.id;
    }

    const contacts = await prisma.contact.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        socialHandles: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
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
            sentAt: true,
            deliveredAt: true,
            readAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        notes: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contactId: true,
            userId: true,
            content: true,
            isPrivate: true,
            mentions: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Opportunistically backfill Slack names if we only have IDs
    const slackIdRegex = /^[UW][A-Z0-9]{8,}$/; // Slack user or workspace IDs typically start with U/W
    try {
      const needsBackfill = contacts.filter((c: any) => {
        const handles = c.socialHandles || {};
        const slack = handles.slack as string | undefined;
        if (!slack) return false;
        const looksLikeId = slackIdRegex.test(c.name || '') || !c.name || c.name.startsWith('Slack User');
        return looksLikeId;
      });

      if (needsBackfill.length && process.env.SLACK_BOT_TOKEN) {
        const { SlackIntegration } = await import('@/lib/integrations/slack');
        const slack = new SlackIntegration();
        for (const c of needsBackfill) {
          const slackId = (c.socialHandles as any)?.slack;
          try {
            const info = await slack.getUserInfo(slackId);
            if (info?.name && info.name !== c.name) {
              await prisma.contact.update({
                where: { id: c.id },
                data: { name: info.name },
              });
              c.name = info.name;
            }
          } catch {
            // ignore failures and keep ID fallback
          }
        }
      }
    } catch {
      // ignore backfill errors silently
    }

    // Deduplicate by stable external keys: social handles -> email -> phone -> id
    const byKey = new Map<string, any>();
    for (const c of contacts) {
      const handles = (c as any).socialHandles || {};
      const key =
        handles.slack ||
        handles.instagram ||
        handles.facebook ||
        handles.twitter ||
        c.email ||
        c.phone ||
        c.id; // fallback

      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, c);
        continue;
      }

      // Merge: keep the most recently updated contact; also keep latest message
      const newer = (existing.updatedAt > c.updatedAt) ? existing : c;
      const older = (existing.updatedAt > c.updatedAt) ? c : existing;
      // Merge last message preview
      const newerMsg = newer.messages?.[0];
      const olderMsg = older.messages?.[0];
      const latestMsg = [newerMsg, olderMsg].filter(Boolean).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const merged = { ...newer, messages: latestMsg ? [latestMsg] : [] };
      byKey.set(key, merged);
    }

    const deduped = Array.from(byKey.values());

    return NextResponse.json(deduped);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/contacts - Create a new contact
 */
export async function POST(req: NextRequest) {
  try {
    let userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    const validatedData = contactSchema.parse(body);

    // Get or create a valid user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // If user doesn't exist, get or create the first user
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'system@example.com',
            name: 'System User',
          },
        });
      }
      userId = user.id;
    }

    const contact = await prisma.contact.create({
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email,
        phones: validatedData.phones || [],
        emails: validatedData.emails || [],
        socialHandles: validatedData.socialHandles,
        tags: validatedData.tags || [],
        userId,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
