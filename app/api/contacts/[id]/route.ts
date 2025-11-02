import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { contactSchema } from '@/lib/validations';
import { z } from 'zod';

/**
 * GET /api/contacts/[id] - Fetch a specific contact
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    
    const contact = await prisma.contact.findUnique({
      where: { id: resolvedParams.id },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/contacts/[id] - Update a contact
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    const body = await req.json();
    const validatedData = contactSchema.partial().parse(body);

    const contact = await prisma.contact.update({
      where: { id: resolvedParams.id },
      data: validatedData,
    });

    return NextResponse.json(contact);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/contacts/[id] - Delete a contact
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Next.js 14 and 15 param formats
    const resolvedParams = 'then' in params ? await params : params;
    
    await prisma.contact.delete({
      where: { id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
