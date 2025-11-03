'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AISuggestionsProps {
  contactId: string;
  onSelect: (suggestion: string) => void;
}

export function AISuggestions({ contactId, onSelect }: AISuggestionsProps) {
  const [expanded, setExpanded] = useState(false);
  const { data: messages } = useQuery({
    queryKey: ['messages', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    staleTime: 0, // Use same query as MessageThread for consistency
    refetchInterval: 3000, // Poll every 3 seconds
  });

  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
  });

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['ai-suggestions', contactId, messages?.length, messages?.[messages.length - 1]?.id],
    queryFn: async () => {
      if (!messages || messages.length === 0) return { suggestions: [] };

      // Use last 10 messages for better context
      const recentMessages = messages.slice(-10);

      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: recentMessages,
          channel: messages[messages.length - 1]?.channel || 'SMS',
          contactName: contact?.name || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch suggestions');
      return res.json();
    },
    enabled: !!messages && messages.length > 0,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (refresh when new message arrives)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  if (isLoading) {
    return (
      <div className="border-t border-border bg-primary/10 p-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">Generating AI suggestions...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border bg-primary/10 p-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">AI Suggestions</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:text-primary/80"
          aria-label={expanded ? 'Collapse suggestions' : 'Expand suggestions'}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      <div
        className={expanded
          ? 'flex flex-wrap gap-2'
          : 'flex flex-wrap gap-2'}
      >
        {suggestions.suggestions.map((suggestion: string, index: number) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className={expanded
              ? 'px-3 py-1.5 bg-card border border-primary/20 text-primary text-sm rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap'
              : 'inline-flex px-3 py-1.5 bg-card border border-primary/20 text-primary text-sm rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap'}
            title={suggestion}
          >
            <span className="line-clamp-1">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

