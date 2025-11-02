'use client';

import { formatRelativeDate, truncate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  messages?: any[];
}

interface ThreadListProps {
  contacts: Contact[];
  selectedContactId: string | null;
  onSelectContact: (id: string) => void;
}

export function ThreadList({ contacts, selectedContactId, onSelectContact }: ThreadListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No contacts yet. Messages from different channels will create contacts automatically.
          </div>
        ) : (
          contacts.map((contact) => {
            const lastMessage = contact.messages?.[0];

            return (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact.id)}
                className={cn(
                  'w-full p-4 border-b border-border hover:bg-accent text-left transition',
                  selectedContactId === contact.id && 'bg-primary/10 border-l-4 border-l-primary'
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-foreground">
                    {contact.name || contact.phone || contact.email || 'Unknown'}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeDate(new Date(lastMessage.createdAt))}
                    </span>
                  )}
                </div>

                {lastMessage && (
                  <p className="text-sm text-muted-foreground">
                    {truncate(lastMessage.content, 60)}
                  </p>
                )}

                <div className="flex gap-1 mt-2">
                  {contact.phone && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      SMS
                    </span>
                  )}
                  {contact.email && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      Email
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
