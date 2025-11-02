import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversation, channel, contactName } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      // Fallback to basic suggestions if API key not configured
      return NextResponse.json({ 
        suggestions: generateFallbackSuggestions(conversation, channel) 
      });
    }

    // Use last 10 messages for context
    const recentMessages = conversation.slice(-10);
    
    if (recentMessages.length === 0) {
      return NextResponse.json({ 
        suggestions: [
          "Hello! How can I help you today?",
          "Thanks for reaching out!",
          "Hi there! What can I help you with?"
        ] 
      });
    }

    // Format conversation history
    const conversationHistory = recentMessages
      .map((msg: any) => {
        const role = msg.direction === 'OUTBOUND' ? 'Agent' : 'Customer';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    const lastMessage = recentMessages[recentMessages.length - 1];
    const isCustomerMessage = lastMessage.direction === 'INBOUND';

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `You are a helpful customer service assistant. Based on the conversation history below, suggest 3 brief, professional, and contextually appropriate reply options for the agent to send to the customer.

Conversation History:
${conversationHistory}

Channel: ${channel}
${contactName ? `Customer Name: ${contactName}` : ''}

${isCustomerMessage 
  ? 'The last message is from the customer. Provide reply suggestions.' 
  : 'The conversation is active. Provide helpful follow-up message suggestions.'}

Requirements:
- Keep suggestions under 50 words each
- Be professional, friendly, and concise
- Match the tone and context of the conversation
- Provide variety in the suggestions
- Focus on being helpful and resolving the customer's needs

Return ONLY 3 suggestions, one per line, no numbering, no additional text:`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Parse suggestions (remove numbering, split by lines)
      const suggestions = text
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.match(/^\d+[\.\)]/))
        .slice(0, 3)
        .filter((s: string) => s.length > 0);

      // Fallback if parsing fails
      if (suggestions.length === 0) {
        return NextResponse.json({ 
          suggestions: generateFallbackSuggestions(conversation, channel) 
        });
      }

      return NextResponse.json({ suggestions });
    } catch (geminiError) {
      console.error('Gemini API error:', geminiError);
      // Fallback to basic suggestions
      return NextResponse.json({ 
        suggestions: generateFallbackSuggestions(conversation, channel) 
      });
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function generateFallbackSuggestions(conversation: any[], channel: string): string[] {
  const suggestions: string[] = [];
  const lastMessage = conversation[conversation.length - 1];
  
  if (!lastMessage) {
    return ["Hello! How can I help you today?", "Thanks for reaching out!", "Hi there! What can I help you with?"];
  }

  const content = lastMessage.content?.toLowerCase() || '';

  if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
    suggestions.push("Hello! How can I assist you?");
    suggestions.push("Hi there! What can I help you with?");
  }

  if (content.includes('?') || content.includes('how') || content.includes('what')) {
    suggestions.push("Let me help you with that.");
    suggestions.push("I'll look into that for you right away.");
  }

  if (content.includes('thank') || content.includes('thanks')) {
    suggestions.push("You're welcome! Is there anything else I can help with?");
  }

  if (suggestions.length === 0) {
    suggestions.push("Got it! I'll follow up on that.");
    suggestions.push("Thanks for letting me know!");
    suggestions.push("I appreciate your message. Let me get back to you shortly.");
  }

  return suggestions.slice(0, 3);
}
