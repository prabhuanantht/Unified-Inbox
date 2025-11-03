import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noteSchema } from '@/lib/validations';
import { z } from 'zod';
import { auth } from '@/lib/auth';

/**
 * GET /api/notes - Fetch notes
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    const where = contactId ? { contactId } : {};

    const notes = await prisma.note.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes - Create a new note
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validatedData = noteSchema.parse(body);

    // Ensure the contact exists and get its associated userId
    const contact = await prisma.contact.findUnique({
      where: { id: validatedData.contactId },
      select: { id: true, userId: true },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Prefer the authenticated user if available; else fall back to contact.userId; else create/get a fallback
    const session = await auth.api.getSession({ headers: req.headers });
    let userId = session?.user?.id || contact.userId || null;

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        userId = null;
      }
    }

    if (!userId) {
      let fallbackUser = await prisma.user.findFirst();
      if (!fallbackUser) {
        fallbackUser = await prisma.user.create({
          data: { email: 'system@example.com', name: 'System User' },
        });
      }
      // Associate contact for future
      await prisma.contact.update({ where: { id: contact.id }, data: { userId: fallbackUser.id } });
      userId = fallbackUser.id;
    }

    const note = await prisma.note.create({
      data: {
        contactId: validatedData.contactId,
        content: validatedData.content,
        isPrivate: validatedData.isPrivate ?? false,
        mentions: validatedData.mentions || [],
        userId,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    );
  }
}
