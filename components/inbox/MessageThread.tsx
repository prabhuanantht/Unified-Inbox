'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChatActions } from './ChatActions';
import { Phone } from 'lucide-react';

interface MessageThreadProps {
  contactId: string;
}

export function MessageThread({ contactId }: MessageThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);

  const { data: messages } = useQuery({
    queryKey: ['messages', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 3000, // Poll every 3 seconds for new messages (works in background by default)
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - contacts don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Auto-scroll to bottom when new messages arrive, scoped to the thread container
  useEffect(() => {
    if (messages && messages.length > prevMessagesLengthRef.current) {
      const el = containerRef.current;
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } else {
        // Fallback: keep behavior scoped as much as possible
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    prevMessagesLengthRef.current = messages?.length || 0;
  }, [messages]);

  if (!messages || !contact) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {contact.name || contact.phone || contact.email}
          </h2>
          <p className="text-sm text-muted-foreground">
            {contact.phone} {contact.email && `• ${contact.email}`}
          </p>
        </div>
        <ChatActions contactId={contactId} />
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <>
            {messages.map((message: any) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-md px-4 py-2.5 rounded-2xl shadow-sm',
                    message.direction === 'OUTBOUND'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-card-foreground'
                  )}
                >
                  {/* Voice call message rendering */}
                  {message.metadata?.voiceCall ? (
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{message.metadata?.callType === 'SCHEDULED' ? 'Call scheduled' : 'Call placed'}</div>
                        {message.content && (
                          <p className="text-sm opacity-90 mt-0.5">Script: {message.content}</p>
                        )}
                        <div className={cn(
                          'flex items-center gap-2 mt-2 text-xs',
                          message.direction === 'OUTBOUND' ? 'opacity-80' : 'text-muted-foreground'
                        )}>
                          <span>{formatRelativeDate(new Date(message.createdAt))}</span>
                          <span className="opacity-60">•</span>
                          <span className="uppercase text-[10px]">CALL</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                  {message.mediaUrls && message.mediaUrls.length > 0 && (
                    <div className="mb-2 space-y-2">
                      {message.mediaUrls.map((url: string, i: number) => {
                        const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith('/uploads');
                        return isImage ? (
                          <img
                            key={i}
                            src={url}
                            alt="Media attachment"
                            className="max-w-full rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 bg-secondary text-primary rounded-lg text-sm hover:bg-secondary/80 transition-colors"
                          >
                            📎 View attachment
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {message.content && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  )}
                  <div className={cn(
                    "flex items-center gap-2 mt-2 text-xs",
                    message.direction === 'OUTBOUND' ? 'opacity-80' : 'text-muted-foreground'
                  )}>
                    <span>{formatRelativeDate(new Date(message.createdAt))}</span>
                    <span className="opacity-60">•</span>
                    <span className="uppercase text-[10px]">{message.channel}</span>
                    {message.status && message.status !== 'SENT' && (
                      <>
                        <span className="opacity-60">•</span>
                        <span className="capitalize">{message.status.toLowerCase()}</span>
                      </>
                    )}
                  </div>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
