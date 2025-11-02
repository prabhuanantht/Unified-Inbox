'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, MoreVertical } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatActionsProps {
  contactId: string;
}

export function ChatActions({ contactId }: ChatActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const queryClient = useQueryClient();

  const clearChat = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear chat');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] });
      toast.success('Chat cleared successfully');
      setShowMenu(false);
    },
    onError: (error) => {
      toast.error(`Failed to clear chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const deleteContact = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete contact');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
      setShowMenu(false);
    },
    onError: (error) => {
      toast.error(`Failed to delete contact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
      clearChat.mutate();
    }
  };

  const handleDeleteContact = () => {
    if (confirm('Are you sure you want to delete this contact and all messages? This action cannot be undone.')) {
      deleteContact.mutate();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition"
        type="button"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[200px] py-1">
            <button
              onClick={handleClearChat}
              disabled={clearChat.isPending}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat
            </button>
            <button
              onClick={handleDeleteContact}
              disabled={deleteContact.isPending}
              className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Delete Contact
            </button>
          </div>
        </>
      )}
    </div>
  );
}

