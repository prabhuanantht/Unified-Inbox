import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/contacts/merge - Merge two contacts into one
 * Body: { sourceId: string, targetId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { sourceId, targetId } = await req.json();
    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json({ error: 'Invalid sourceId/targetId' }, { status: 400 });
    }

    const [source, target] = await Promise.all([
      prisma.contact.findUnique({ where: { id: sourceId } }),
      prisma.contact.findUnique({ where: { id: targetId } }),
    ]);

    if (!source || !target) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Merge social handles (prefer target values)
    const targetHandles = (target.socialHandles as any) || {};
    const sourceHandles = (source.socialHandles as any) || {};
    const mergedHandles = { ...sourceHandles, ...targetHandles };

    // Move messages and notes from source to target
    await prisma.$transaction([
      prisma.message.updateMany({ where: { contactId: source.id }, data: { contactId: target.id } }),
      prisma.note.updateMany({ where: { contactId: source.id }, data: { contactId: target.id } }),
      prisma.contact.update({
        where: { id: target.id },
        data: {
          name: target.name || source.name,
          phone: target.phone || source.phone,
          email: target.email || source.email,
          socialHandles: mergedHandles,
          tags: Array.from(new Set([...(target.tags || []), ...(source.tags || [])])),
        },
      }),
      prisma.contact.delete({ where: { id: source.id } }),
    ]);

    const updated = await prisma.contact.findUnique({ where: { id: target.id } });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Merge contacts error:', error);
    return NextResponse.json({ error: 'Failed to merge contacts' }, { status: 500 });
  }
}


