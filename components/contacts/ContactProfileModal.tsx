'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Phone, Mail, Clock, MessageSquare, AtSign, Lock, Unlock, Sparkles, Loader2 } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ContactProfileModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
}

export function ContactProfileModal({ open, onClose, contactId }: ContactProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [noteIsPrivate, setNoteIsPrivate] = useState(false);
  const queryClient = useQueryClient();

  // Fetch contact details
  const { data: contact } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch contact');
      return res.json();
    },
  });

  // Fetch all messages for this contact
  const { data: messages } = useQuery({
    queryKey: ['messages', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/messages?contactId=${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
  });

  // Fetch notes for this contact
  const { data: notes } = useQuery({
    queryKey: ['notes', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/notes?contactId=${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
  });

  // Fetch AI summary
  const { data: aiSummary, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['contact-summary', contactId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/contact-summary?contactId=${contactId}`);
      if (!res.ok) throw new Error('Failed to fetch AI summary');
      return res.json();
    },
    enabled: false, // Don't fetch automatically
  });

  const createNote = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create note');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Note created successfully');
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['notes', contactId] });
    },
    onError: () => {
      toast.error('Failed to create note');
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNote.mutate({
      contactId,
      content: newNote,
      isPrivate: noteIsPrivate,
    });
  };

  // Generate timeline from messages
  const timeline = messages?.map((message: any) => ({
    id: message.id,
    type: message.direction === 'INBOUND' ? 'received' : 'sent',
    content: message.content,
    channel: message.channel,
    status: message.status,
    timestamp: message.createdAt,
  })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-2xl font-bold">Contact Profile</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {contact && (
          <div className="space-y-6">
            {/* Contact Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {contact.name || 'Unnamed Contact'}
                </h3>
                <div className="space-y-2">
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{contact.phone}</span>
                      <VoIPButton phoneNumber={contact.phone} />
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {contact.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Summary Card */}
              <AISummaryCard 
                isLoading={aiLoading}
                summary={aiSummary?.summary}
                onGenerate={() => refetchAI()}
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              {contact.phone && (
                <VoIPButton phoneNumber={contact.phone} variant="full" />
              )}
              {contact.email && (
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              )}
              <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Message
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'timeline'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Timeline
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'notes'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Notes
              </button>
            </div>

            {/* Content */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                {timeline && timeline.length > 0 ? (
                  timeline.map((item: any) => (
                    <div
                      key={item.id}
                      className={`flex gap-3 p-3 rounded-lg ${
                        item.type === 'received'
                          ? 'bg-card border border-border'
                          : 'bg-primary/5 border border-primary/20'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.type === 'received' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {item.type === 'received' ? (
                            <Mail className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Mail className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {item.type === 'received' ? 'Received' : 'Sent'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(new Date(item.timestamp))}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                            {item.channel}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity yet
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note Form */}
                <div className="bg-card border border-border rounded-lg p-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this contact... Use @username for mentions"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-3"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setNoteIsPrivate(!noteIsPrivate)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {noteIsPrivate ? (
                        <><Lock className="w-4 h-4" /> Private</>
                      ) : (
                        <><Unlock className="w-4 h-4" /> Public</>
                      )}
                    </button>
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || createNote.isPending}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createNote.isPending ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </div>

                {/* Notes List */}
                {notes && notes.length > 0 ? (
                  <div className="space-y-3">
                    {notes.map((note: any) => (
                      <div
                        key={note.id}
                        className="bg-card border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {note.isPrivate && (
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-sm font-medium text-foreground">
                              {note.user?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(new Date(note.createdAt))}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {note.content}
                        </p>
                        {note.mentions && note.mentions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {note.mentions.map((mention: string) => (
                              <span
                                key={mention}
                                className="text-xs px-2 py-1 bg-primary/20 text-primary rounded flex items-center gap-1"
                              >
                                <AtSign className="w-3 h-3" />
                                {mention}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No notes yet
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AISummaryCard({ isLoading, summary, onGenerate }: any) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4 min-w-[300px]">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h4 className="font-semibold text-foreground">AI Summary</h4>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Analyzing conversation...</span>
        </div>
      ) : summary ? (
        <p className="text-sm text-foreground">{summary}</p>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Get an AI-powered summary of this contact's conversation history
          </p>
          <button
            onClick={() => onGenerate()}
            className="text-xs px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
}

function VoIPButton({ phoneNumber, variant = 'icon' }: { phoneNumber: string; variant?: 'icon' | 'full' }) {
  return (
    <button
      onClick={async () => {
        try {
          const res = await fetch('/api/twilio/call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phoneNumber }),
          });
          if (!res.ok) throw new Error('Failed to initiate call');
          toast.success('Call initiated!');
        } catch (error) {
          toast.error('Failed to initiate call');
          console.error(error);
        }
      }}
      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
    >
      <Phone className="w-4 h-4" />
      {variant === 'full' && <span>Call</span>}
    </button>
  );
}

