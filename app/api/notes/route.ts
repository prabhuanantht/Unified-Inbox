import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { noteSchema } from '@/lib/validations';
import { z } from 'zod';

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
    const userId = req.headers.get('x-user-id') || 'temp-user-id';
    const body = await req.json();

    const validatedData = noteSchema.parse(body);

    const note = await prisma.note.create({
      data: {
        ...validatedData,
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
