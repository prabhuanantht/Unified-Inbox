'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { MessageSquare, Phone, Mail, MessageCircle, RefreshCw, Reply, Plus, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { NewMessageComposer } from './NewMessageComposer';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const channelIcons = {
  SMS: Phone,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  TWITTER: MessageSquare,
  FACEBOOK: MessageSquare,
  INSTAGRAM: MessageSquare,
  SLACK: MessageSquare,
};

const channelColors: Record<string, string> = {
  SMS: 'bg-blue-100 text-blue-700 border-blue-300',
  WHATSAPP: 'bg-green-100 text-green-700 border-green-300',
  EMAIL: 'bg-purple-100 text-purple-700 border-purple-300',
  TWITTER: 'bg-sky-100 text-sky-700 border-sky-300',
  FACEBOOK: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  INSTAGRAM: 'bg-pink-100 text-pink-700 border-pink-300',
  SLACK: 'bg-purple-100 text-purple-700 border-purple-300',
};

interface Message {
  id: string;
  contactId: string;
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL' | 'TWITTER' | 'FACEBOOK' | 'INSTAGRAM' | 'SLACK';
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  status: string;
  mediaUrls: string[];
  createdAt: string;
  contact: {
    id: string;
    name?: string;
    phone?: string;
    email?: string;
  };
}

export function UnifiedInboxFeed() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const urlChannel = searchParams?.get('channel');
  const [selectedChannel, setSelectedChannel] = useState<string | null>(urlChannel || null);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState<string>(searchParams?.get('start') || '');
  const [endDate, setEndDate] = useState<string>(searchParams?.get('end') || '');
  const [direction, setDirection] = useState<string>(searchParams?.get('dir') || '');
  const q = searchParams?.get('q')?.trim() || '';
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const queryClient = useQueryClient();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [timeTick, setTimeTick] = useState(0); // Used to trigger re-renders for relative time display
  const lastSyncTimeRef = useRef<Date | null>(null);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep local state in sync if URL changes externally
  useEffect(() => {
    setSelectedChannel(urlChannel || null);
    setStartDate(searchParams?.get('start') || '');
    setEndDate(searchParams?.get('end') || '');
    setDirection(searchParams?.get('dir') || '');
  }, [urlChannel, searchParams]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) params.delete(k); else params.set(k, v);
    });
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
  }, [pathname, router, searchParams]);

  // Sync messages mutation
  const syncMessages = useMutation({
    mutationFn: async ({ channels, silent = false }: { channels?: string[]; silent?: boolean } = {}) => {
      // Prevent overlapping syncs
      if (isSyncingRef.current) {
        throw new Error('Sync already in progress');
      }
      isSyncingRef.current = true;
      
      try {
        const res = await fetch('/api/sync/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channels, limit: 10000 }), // Fetch up to 10,000 messages per channel for full history
        });
        if (!res.ok) throw new Error('Failed to sync messages');
        return { ...(await res.json()), silent };
      } finally {
        isSyncingRef.current = false;
      }
    },
    onSuccess: (data) => {
      const now = new Date();
      setLastSyncTime(now);
      lastSyncTimeRef.current = now;
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      // Only show toast for manual syncs (not silent/automatic ones)
      if (!data.silent) {
        const count = data.synced || data.syncedMessages?.length || 0;
        toast.success(`Synced ${count} messages from all channels`);
      }
    },
    onError: (error, variables) => {
      isSyncingRef.current = false;
      // Only show error toast for manual syncs
      if (!variables?.silent) {
        toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
  });

  // Send reply mutation
  const sendReply = useMutation({
    mutationFn: async (data: { contactId: string; channel: string; content: string; replyToMessageId?: string }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setReplyingTo(null);
      setReplyContent('');
      toast.success('Reply sent successfully');
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const { data: messages, isLoading, error } = useQuery<Message[]>({
    queryKey: ['messages', selectedChannel],
    queryFn: async () => {
      try {
        // Build URL with query params
        const params = new URLSearchParams();
        params.set('all', 'true');
        if (selectedChannel) params.set('channel', selectedChannel);
        
        const url = `/api/messages?${params.toString()}`;
        console.log('Fetching messages from:', url);
        
        const res = await fetch(url);
        
        if (!res.ok) {
          const errorText = await res.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText || `HTTP ${res.status}` };
          }
          console.error('Failed to fetch messages:', errorData);
          throw new Error(errorData.error || `Failed to fetch messages: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Fetched messages:', Array.isArray(data) ? data.length : 0, 'messages');
        return Array.isArray(data) ? data : [];
      } catch (err) {
        console.error('Error in queryFn:', err);
        throw err;
      }
    },
    retry: 2,
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5000, // Poll every 5 seconds for new messages in unified feed (works in background by default)
  });

  // Store sync mutate function in ref to avoid dependency issues
  const syncMutateRef = useRef(syncMessages.mutate);
  useEffect(() => {
    syncMutateRef.current = syncMessages.mutate;
  }, [syncMessages.mutate]);

  // Automatic periodic syncing to fetch new messages from integrations
  // This ensures messages appear even if webhooks aren't configured
  useEffect(() => {
    const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // Minimum 5 minutes between syncs
    const AUTO_SYNC_INTERVAL = 10 * 60 * 1000; // Auto sync every 10 minutes
    
    const performSync = () => {
      // Check if we're already syncing
      if (isSyncingRef.current) {
        return;
      }
      
      // Check if enough time has passed since last sync (using ref to avoid closure issues)
      if (lastSyncTimeRef.current) {
        const timeSinceLastSync = Date.now() - lastSyncTimeRef.current.getTime();
        if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
          // Too soon since last sync, skip this one
          return;
        }
      }
      
      // Perform silent sync using ref
      syncMutateRef.current({ silent: true });
    };

    // Sync once after initial mount (wait a bit for initial query to finish)
    syncTimeoutRef.current = setTimeout(() => {
      performSync();
    }, 5000); // Wait 5 seconds after mount

    // Set up periodic syncing every 10 minutes
    syncIntervalRef.current = setInterval(() => {
      performSync();
    }, AUTO_SYNC_INTERVAL);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []); // Empty deps - only run once on mount

  // Update last sync time display periodically to show "X ago" updating
  useEffect(() => {
    if (!lastSyncTime) return;
    
    const interval = setInterval(() => {
      // Force re-render to update the relative time display
      setTimeTick(prev => prev + 1);
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-destructive text-center mb-4">
          <p className="font-semibold mb-2">Failed to load messages</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['messages'] })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-background">
        {/* Header - Always visible even when no messages */}
        <div className="border-b border-border bg-card">
          {/* Top row: Action buttons */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground">Unified Inbox</h2>
              {lastSyncTime && (
                <span className="text-xs text-muted-foreground">
                  Last synced: {formatRelativeDate(lastSyncTime)}
                </span>
              )}
            </div>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                title="New Message"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
              <button
                onClick={() => syncMessages.mutate({})}
                disabled={syncMessages.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                title="Sync All Messages"
              >
                <RefreshCw className={cn('w-4 h-4', syncMessages.isPending && 'animate-spin')} />
                <span className="hidden sm:inline">Sync</span>
              </button>
              <button
                onClick={() => setShowFilters((s) => !s)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition text-sm font-medium"
                title="Filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>

              {showFilters && (
                <>
                  <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowFilters(false)} />
                  <div className="fixed z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,900px)] border border-border rounded-xl bg-card shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">Filters</h3>
                      <button onClick={() => setShowFilters(false)} className="p-2 rounded hover:bg-accent" aria-label="Close filters">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-5 grid grid-cols-1 gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-muted-foreground">Channel</label>
                        <select
                          value={selectedChannel || ''}
                          onChange={(e) => { const val = e.target.value || null; setSelectedChannel(val); updateParams({ channel: val }); }}
                          className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm"
                        >
                          <option value="">All</option>
                          {['SMS','WHATSAPP','EMAIL','FACEBOOK','INSTAGRAM','TWITTER','SLACK'].map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-muted-foreground">Direction</label>
                        <select
                          value={direction}
                          onChange={(e) => { setDirection(e.target.value); updateParams({ dir: e.target.value || null }); }}
                          className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm"
                        >
                          <option value="">All</option>
                          <option value="INBOUND">Inbound</option>
                          <option value="OUTBOUND">Outbound</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm text-muted-foreground">Date range</label>
                        <div className="flex items-center gap-3">
                          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm w-full" />
                          <span className="text-muted-foreground">–</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm w-full" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                      <button onClick={() => { setStartDate(''); setEndDate(''); setDirection(''); setSelectedChannel(null); updateParams({ start: null, end: null, dir: null, channel: null }); }} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">Clear all</button>
                      <button onClick={() => { updateParams({ start: startDate || null, end: endDate || null }); setShowFilters(false); }} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Active filter chips row (only when any filter is active) */}
          {(selectedChannel || direction || startDate || endDate || q) && (
            <div className="px-4 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedChannel && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                    Channel: {selectedChannel}
                    <button onClick={() => { setSelectedChannel(null); updateParams({ channel: null }); }} aria-label="Clear channel">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {direction && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                    Dir: {direction}
                    <button onClick={() => { setDirection(''); updateParams({ dir: null }); }} aria-label="Clear direction">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {(startDate || endDate) && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                    {startDate || '…'} – {endDate || '…'}
                    <button onClick={() => { setStartDate(''); setEndDate(''); updateParams({ start: null, end: null }); }} aria-label="Clear date">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {q && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                    Search: “{q}”
                    <button onClick={() => updateParams({ q: null })} aria-label="Clear search">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2 text-foreground">No messages {selectedChannel ? `in ${selectedChannel}` : ''}</p>
          <p className="text-sm text-center px-4">{selectedChannel ? `Try selecting a different filter or sync messages from this channel` : 'Messages from SMS, WhatsApp, Email, and other channels will appear here'}</p>
        </div>

        {/* New Message Composer Modal */}
        {showNewMessage && (
          <NewMessageComposer onClose={() => setShowNewMessage(false)} />
        )}
      </div>
    );
  }

  // Filter messages client-side based on URL params (computed unconditionally)
  const filtered = (() => {
    const startTs = startDate ? new Date(startDate + 'T00:00:00').getTime() : null;
    const endTs = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : null;
    const qLower = (q || '').toLowerCase();
    const list = Array.isArray(messages) ? messages : [];
    return list.filter((m) => {
      if (selectedChannel && m.channel !== selectedChannel) return false;
      if (direction && m.direction !== direction) return false;
      const ts = new Date(m.createdAt).getTime();
      if (startTs && ts < startTs) return false;
      if (endTs && ts > endTs) return false;
      if (qLower) {
        const name = m.contact?.name || '';
        const phone = (m as any).contact?.phone || '';
        const email = m.contact?.email || '';
        const content = m.content || '';
        const hay = `${name} ${phone} ${email} ${content}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  })();

  // Group messages by date
  const groupedMessages = filtered.reduce((acc, message) => {
    try {
      if (!message || !message.createdAt) return acc;
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(message);
    } catch (error) {
      console.error('Error processing message:', error, message);
    }
    return acc;
  }, {} as Record<string, Message[]>);

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleSendReply = () => {
    if (!replyingTo || !replyContent.trim()) return;
    
    sendReply.mutate({
      contactId: replyingTo.contactId,
      channel: replyingTo.channel,
      content: replyContent,
      replyToMessageId: replyingTo.channel === 'EMAIL' ? replyingTo.id : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Always visible */}
      <div className="border-b border-border bg-card">
        {/* Top row: Action buttons */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Unified Inbox</h2>
            {lastSyncTime && (
              <span className="text-xs text-muted-foreground">
                Last synced: {formatRelativeDate(lastSyncTime)}
              </span>
            )}
          </div>
          <div className="flex gap-2 relative">
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
              title="New Message"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => syncMessages.mutate({})}
              disabled={syncMessages.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              title="Sync All Messages"
            >
              <RefreshCw className={cn('w-4 h-4', syncMessages.isPending && 'animate-spin')} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition text-sm font-medium"
              title="Filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setShowFilters(false)} />
                <div className="fixed z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,900px)] border border-border rounded-xl bg-card shadow-2xl">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground">Filters</h3>
                    <button onClick={() => setShowFilters(false)} className="p-2 rounded hover:bg-accent" aria-label="Close filters">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 grid grid-cols-1 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-muted-foreground">Channel</label>
                      <select
                        value={selectedChannel || ''}
                        onChange={(e) => { const val = e.target.value || null; setSelectedChannel(val); updateParams({ channel: val }); }}
                        className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm"
                      >
                        <option value="">All</option>
                        {['SMS','WHATSAPP','EMAIL','FACEBOOK','INSTAGRAM','TWITTER','SLACK'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-muted-foreground">Direction</label>
                      <select
                        value={direction}
                        onChange={(e) => { setDirection(e.target.value); updateParams({ dir: e.target.value || null }); }}
                        className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm"
                      >
                        <option value="">All</option>
                        <option value="INBOUND">Inbound</option>
                        <option value="OUTBOUND">Outbound</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-muted-foreground">Date range</label>
                      <div className="flex items-center gap-3">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm w-full" />
                        <span className="text-muted-foreground">–</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-border rounded-md bg-background text-foreground text-sm w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
                    <button onClick={() => { setStartDate(''); setEndDate(''); setDirection(''); setSelectedChannel(null); updateParams({ start: null, end: null, dir: null, channel: null }); }} className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm">Clear all</button>
                    <button onClick={() => { updateParams({ start: startDate || null, end: endDate || null }); setShowFilters(false); }} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Apply</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active filter chips row (only when any filter is active) */}
        {(selectedChannel || direction || startDate || endDate || q) && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              {selectedChannel && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                  Channel: {selectedChannel}
                  <button onClick={() => { setSelectedChannel(null); updateParams({ channel: null }); }} aria-label="Clear channel">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {direction && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                  Dir: {direction}
                  <button onClick={() => { setDirection(''); updateParams({ dir: null }); }} aria-label="Clear direction">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                  {startDate || '…'} – {endDate || '…'}
                  <button onClick={() => { setStartDate(''); setEndDate(''); updateParams({ start: null, end: null }); }} aria-label="Clear date">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {q && (
                <span className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary/10 text-foreground">
                  Search: “{q}”
                  <button onClick={() => updateParams({ q: null })} aria-label="Clear search">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto bg-background">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="mb-6">
            {/* Date Header */}
            <div className="sticky top-0 bg-secondary px-4 py-2 border-b border-border z-10">
              <span className="text-xs font-semibold text-muted-foreground uppercase">
                {date === new Date().toLocaleDateString() ? 'Today' : 
                 date === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Yesterday' :
                 date}
              </span>
            </div>

            {/* Messages for this date */}
            <div className="space-y-1 px-4">
              {dateMessages.map((message) => {
                const Icon = channelIcons[message.channel] || MessageSquare;
                const channelColorClass = channelColors[message.channel] || channelColors.SMS;
                const contactName = message.contact?.name || 
                                  message.contact?.phone || 
                                  message.contact?.email || 
                                  'Unknown';

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'p-4 rounded-lg border-l-4 cursor-pointer transition',
                      message.direction === 'INBOUND' ? 'bg-card hover:bg-secondary/50' : 'bg-primary/5 hover:bg-primary/10',
                      message.channel === 'SMS' ? 'border-blue-400' :
                      message.channel === 'WHATSAPP' ? 'border-green-400' :
                      message.channel === 'EMAIL' ? 'border-purple-400' :
                      message.channel === 'INSTAGRAM' ? 'border-pink-400' :
                      message.channel === 'SLACK' ? 'border-purple-400' :
                      'border-blue-400'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{contactName}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium border',
                          channelColorClass
                        )}>
                          {message.channel}
                        </span>
                        {message.direction === 'INBOUND' && (
                          <span className="text-xs text-muted-foreground">→ Incoming</span>
                        )}
                        {message.direction === 'OUTBOUND' && (
                          <span className="text-xs text-muted-foreground">← Outgoing</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    <p className="text-foreground mb-2 whitespace-pre-wrap">{message.content || '(No content)'}</p>

                    {message.mediaUrls && message.mediaUrls.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {message.mediaUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="Attachment"
                            className="w-20 h-20 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}

                    {/* Reply Button */}
                    {message.direction === 'INBOUND' && (
                      <button
                        onClick={() => handleReply(message)}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                      >
                        <Reply className="w-3 h-3" />
                        Reply
                      </button>
                    )}

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span className={cn(
                        message.status === 'DELIVERED' || message.status === 'SENT' 
                          ? 'text-green-600' 
                          : message.status === 'FAILED'
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      )}>
                        {message.status || 'PENDING'}
                      </span>
                      <span>•</span>
                      <span>{formatRelativeDate(new Date(message.createdAt))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Reply Composer */}
      {replyingTo && (
        <div className="border-t border-border bg-card p-4">
          <div className="mb-2">
            <span className="text-sm text-muted-foreground">
              Replying to <strong className="text-foreground">{replyingTo.contact?.name || replyingTo.contact?.phone || 'Unknown'}</strong> via {replyingTo.channel}
            </span>
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              placeholder="Type your reply..."
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={2}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || sendReply.isPending}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendReply.isPending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* New Message Composer Modal */}
      {showNewMessage && (
        <NewMessageComposer onClose={() => setShowNewMessage(false)} />
      )}
    </div>
  );
}

