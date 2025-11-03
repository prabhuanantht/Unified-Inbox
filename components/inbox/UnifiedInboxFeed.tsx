'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { MessageSquare, Phone, Mail, MessageCircle, RefreshCw, Reply, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { NewMessageComposer } from './NewMessageComposer';

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
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const queryClient = useQueryClient();

  // Sync messages mutation
  const syncMessages = useMutation({
    mutationFn: async (channels?: string[]) => {
      const res = await fetch('/api/sync/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, limit: 10000 }), // Fetch up to 10,000 messages per channel for full history
      });
      if (!res.ok) throw new Error('Failed to sync messages');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      const count = data.synced || data.syncedMessages?.length || 0;
      toast.success(`Synced ${count} messages from all channels`);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        if (selectedChannel) {
          params.set('channel', selectedChannel);
        }
        
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
            <h2 className="text-lg font-semibold text-foreground">Unified Inbox</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewMessage(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                title="New Message"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New</span>
              </button>
              <button
                onClick={() => syncMessages.mutate(undefined)}
                disabled={syncMessages.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                title="Sync All Messages"
              >
                <RefreshCw className={cn('w-4 h-4', syncMessages.isPending && 'animate-spin')} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>
          </div>

          {/* Filter bar - Always visible */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1.5 whitespace-nowrap">Filter:</span>
              <div className="flex flex-wrap gap-2 flex-1">
                <button
                  onClick={() => setSelectedChannel(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                    selectedChannel === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  All
                </button>
                {(['SMS', 'WHATSAPP', 'EMAIL', 'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'SLACK'] as const).map((channel) => {
                  const Icon = channelIcons[channel] || MessageSquare;
                  return (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 whitespace-nowrap',
                        selectedChannel === channel
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {channel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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

  // Group messages by date
  const groupedMessages = messages.reduce((acc, message) => {
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
          <h2 className="text-lg font-semibold text-foreground">Unified Inbox</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
              title="New Message"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => syncMessages.mutate(undefined)}
              disabled={syncMessages.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              title="Sync All Messages"
            >
              <RefreshCw className={cn('w-4 h-4', syncMessages.isPending && 'animate-spin')} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </div>

        {/* Filter bar - Always visible, scrolling when needed */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1.5 whitespace-nowrap">Filter:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => setSelectedChannel(null)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                  selectedChannel === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                All
              </button>
              {(['SMS', 'WHATSAPP', 'EMAIL', 'FACEBOOK', 'INSTAGRAM', 'TWITTER', 'SLACK'] as const).map((channel) => {
                const Icon = channelIcons[channel] || MessageSquare;
                return (
                  <button
                    key={channel}
                    onClick={() => setSelectedChannel(channel)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 whitespace-nowrap',
                      selectedChannel === channel
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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

