import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        { error: 'contactId is required' },
        { status: 400 }
      );
    }

    // Fetch contact details
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    // Fetch all messages for this contact
    const messages = await prisma.message.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 messages for context
    });

    type MessageLite = {
      direction: 'INBOUND' | 'OUTBOUND';
      channel: string;
      createdAt: Date;
      content: string | null;
    };
    const typedMessages = messages as unknown as MessageLite[];

    if (typedMessages.length === 0) {
      return NextResponse.json({
        summary: 'No conversation history available yet.',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      // Fallback: generate a basic summary from message patterns
      const inboundCount = typedMessages.filter((m: MessageLite) => m.direction === 'INBOUND').length;
      const outboundCount = typedMessages.filter((m: MessageLite) => m.direction === 'OUTBOUND').length;
      const channels = [...new Set(typedMessages.map((m: MessageLite) => m.channel))];
      
      return NextResponse.json({
        summary: `Contact has ${messages.length} messages across ${channels.length} channel(s) (${channels.join(', ')}). ${inboundCount} incoming, ${outboundCount} outgoing messages.`,
      });
    }

    // Format conversation for AI
    const conversationText = typedMessages
      .slice()
      .reverse() // Reverse to chronological order
      .map((msg: MessageLite, idx: number) => {
        const role = msg.direction === 'INBOUND' ? 'Customer' : 'Agent';
        const date = new Date(msg.createdAt).toLocaleDateString();
        return `${idx + 1}. [${date}] ${role} (${msg.channel}): ${msg.content?.substring(0, 200)}`;
      })
      .join('\n\n');

    const contactInfo = [
      contact.name ? `Name: ${contact.name}` : '',
      contact.phone ? `Phone: ${contact.phone}` : '',
      contact.email ? `Email: ${contact.email}` : '',
      contact.tags.length > 0 ? `Tags: ${contact.tags.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    // Prefer newer models when available; allow override via env
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Analyze the following customer conversation history and provide a concise summary (2-3 sentences) focusing on:
1. Key topics discussed
2. Customer sentiment/needs
3. Any important patterns or recurring themes

Contact Information:
${contactInfo}

Conversation History:
${conversationText}

Provide a clear, professional summary that would help a new team member quickly understand this customer's context.`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      return NextResponse.json({ summary: summary.trim() });
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      
      // Fallback summary
      const inboundCount = typedMessages.filter((m: MessageLite) => m.direction === 'INBOUND').length;
      const outboundCount = typedMessages.filter((m: MessageLite) => m.direction === 'OUTBOUND').length;
      const channels = [...new Set(typedMessages.map((m: MessageLite) => m.channel))];
      const recentTopics = typedMessages
        .slice(0, 5)
        .map((m: MessageLite) => m.content?.substring(0, 50))
        .filter((t): t is string => Boolean(t));

      return NextResponse.json({
        summary: `Customer interaction summary: ${typedMessages.length} total messages across ${channels.join(', ')}. Active communication with ${inboundCount} incoming and ${outboundCount} outgoing messages. Recent topics include: ${recentTopics.join('; ')}.`,
        _fallback: true,
      });
    }
  } catch (error) {
    console.error('Error generating contact summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

