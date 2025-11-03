'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Lock, Unlock, AtSign } from 'lucide-react';

interface EnhancedNoteEditorProps {
  contactId: string;
  onAddNote: (content: string, isPrivate: boolean) => void;
  isLoading?: boolean;
}

export function EnhancedNoteEditor({ contactId, onAddNote, isLoading }: EnhancedNoteEditorProps) {
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionListRef = useRef<HTMLDivElement>(null);

  // Minimal user type for mentions
  interface UserLite { id: string; name: string; email: string }

  // Fetch users for mentions
  const { data: users = [] } = useQuery<UserLite[]>({
    queryKey: ['users'],
    queryFn: async (): Promise<UserLite[]> => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  const filteredUsers = users.filter((user: UserLite) =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(value);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Only show mentions if we're still typing the username (no space after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
        return;
      }
    }

    setShowMentions(false);
  };

  const insertMention = (user: UserLite) => {
    if (!textareaRef.current) return;

    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
      const newContent = `${beforeAt}@${user.name} ${textAfterCursor}`;
      setContent(newContent);
      setShowMentions(false);
      setMentionQuery('');

      // Focus back on textarea
      setTimeout(() => {
        textareaRef.current?.focus();
        const newCursorPos = beforeAt.length + user.name.length + 2; // @ + name + space
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && mentionListRef.current) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // TODO: Implement keyboard navigation for mentions
      }
      if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault();
        insertMention(filteredUsers[0]);
      }
      if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAddNote(content, isPrivate);
    setContent('');
  };

  // Close mentions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    if (showMentions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentions]);

  // Extract mentions from content
  const extractMentions = (text: string): string[] => {
    const mentions: string[] = [];
    const mentionRegex = /@(\w+(?:\s+\w+)*)/g;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionedName = match[1];
      const user = users.find(u => 
        u.name.toLowerCase() === mentionedName.toLowerCase()
      );
      if (user) {
        mentions.push(user.name);
      }
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          data-contact-id={contactId}
          placeholder="Add a note about this contact... Use @username for mentions"
          className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-3"
          rows={3}
        />

        {/* Mention Suggestions Dropdown */}
        {showMentions && (
          <div
            ref={mentionListRef}
            className="absolute z-50 w-64 bg-card border border-border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto"
          >
            {filteredUsers.length > 0 ? (
              <div className="py-2">
                {filteredUsers.map((user: UserLite) => (
                  <button
                    key={user.id}
                    onClick={() => insertMention(user)}
                    className="w-full px-4 py-2 text-left hover:bg-secondary transition-colors flex items-center gap-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <AtSign className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview extracted mentions */}
      {content && (
        <div className="mb-3">
          {extractMentions(content).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Mentions:</span>
              {extractMentions(content).map((mention) => (
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
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isPrivate ? (
            <><Lock className="w-4 h-4" /> Private</>
          ) : (
            <><Unlock className="w-4 h-4" /> Public</>
          )}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </div>
  );
}

