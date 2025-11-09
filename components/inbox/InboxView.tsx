'use client';

import { useState, Suspense } from 'react';
import { UnifiedInboxFeed } from './UnifiedInboxFeed';
import { ThreadList } from './ThreadList';
import { MessageThread } from './MessageThread';
import { Composer } from './Composer';
import { useQuery } from '@tanstack/react-query';

type ViewMode = 'unified' | 'contacts';

export function InboxView() {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const { data: contacts } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    staleTime: 0, // Always consider stale for real-time updates
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 5000, // Poll every 5 seconds for contact updates (to show new messages in thread list)
  });

  // Unified inbox view - shows all messages from all channels
  if (viewMode === 'unified') {
    return (
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="hidden md:flex md:w-72 lg:w-80 border-r border-border bg-card flex-col min-h-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Inbox</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('unified')}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
              >
                Unified Feed
              </button>
              <button
                onClick={() => setViewMode('contacts')}
                className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80"
              >
                Contacts
              </button>
            </div>
          </div>
          <ThreadList
            contacts={contacts || []}
            selectedContactId={selectedContactId}
            onSelectContact={(id) => {
              setSelectedContactId(id);
              setViewMode('contacts');
            }}
          />
        </div>
        <div className="flex-1 min-h-0 min-w-0">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>}>
            <UnifiedInboxFeed />
          </Suspense>
        </div>
      </div>
    );
  }

  // Contact-based view - shows messages for a specific contact
  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="hidden md:flex md:w-72 lg:w-80 border-r border-border bg-card flex-col min-h-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Inbox</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('unified');
                setSelectedContactId(null);
              }}
              className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80"
            >
              Unified Feed
            </button>
            <button
              onClick={() => setViewMode('contacts')}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Contacts
            </button>
          </div>
        </div>
        <ThreadList
          contacts={contacts || []}
          selectedContactId={selectedContactId}
          onSelectContact={setSelectedContactId}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {selectedContactId ? (
          <>
            <div className="flex-1 min-h-0 min-w-0">
              <MessageThread contactId={selectedContactId} />
            </div>
            <div className="border-t border-border bg-card">
              <Composer contactId={selectedContactId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
