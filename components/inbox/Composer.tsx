'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Calendar, Image, File, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { EmojiPicker } from './EmojiPicker';
import { AISuggestions } from './AISuggestions';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ComposerProps {
  contactId: string;
}

export function Composer({ contactId }: ComposerProps) {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState(''); // For EMAIL channel
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'FACEBOOK' | 'TWITTER' | 'INSTAGRAM' | 'SLACK'>('SMS');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callText, setCallText] = useState('');
  const [callSchedule, setCallSchedule] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (data: { contactId: string; channel: string; content: string; subject?: string; mediaUrls?: string[]; scheduledFor?: Date | null }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          scheduledFor: data.scheduledFor?.toISOString() || undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to send message';
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate all message-related queries for immediate update
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] }); // Update thread list
      const wasScheduled = !!variables.scheduledFor;
      setContent('');
      setSubject('');
      setMediaUrls([]);
      setScheduledFor(null);
      toast.success(wasScheduled ? 'Message scheduled successfully' : 'Message sent successfully');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to send message: ${errorMessage}`);
      console.error('Send error:', error);
    },
  });

  const handleSend = () => {
    if (!content.trim() && mediaUrls.length === 0) return;
    sendMessage.mutate({ 
      contactId, 
      channel, 
      content, 
      subject: channel === 'EMAIL' ? subject : undefined,
      mediaUrls, 
      scheduledFor 
    });
  };

  const handleSchedule = (dateTime: Date) => {
    if (!content.trim() && mediaUrls.length === 0) {
      toast.error('Please enter a message before scheduling');
      return;
    }
    setScheduledFor(dateTime);
    sendMessage.mutate({ contactId, channel, content, mediaUrls, scheduledFor: dateTime });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/cloudinary', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      setMediaUrls([...mediaUrls, data.url]);
      toast.success('File uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      console.error('Upload error:', error);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/uploads/cloudinary', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Upload failed');
      }

      const data = await res.json();
      setMediaUrls([...mediaUrls, data.url]);
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
      console.error('Upload error:', error);
    }
    
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent(content + emoji);
  };

  const removeMedia = (index: number) => {
    setMediaUrls(mediaUrls.filter((_, i) => i !== index));
  };

  // Auto-resize textarea up to a max height, then allow scrolling
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const baseRows = channel === 'EMAIL' ? 2 : 1;
    const lineHeightPx = 20; // Tailwind leading-5 ≈ 20px
    const verticalPaddingPx = 16; // py-2 => 8px top + 8px bottom
    const minHeight = baseRows * lineHeightPx + verticalPaddingPx;
    const maxRows = channel === 'EMAIL' ? 6 : 4;
    const maxHeight = maxRows * lineHeightPx + verticalPaddingPx;

    el.style.height = 'auto';
    const next = Math.max(minHeight, Math.min(el.scrollHeight, maxHeight));
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [content, channel]);

  return (
    <div className="border-t border-border bg-card">
      <AISuggestions
        contactId={contactId}
        onSelect={(suggestion) => setContent(suggestion)}
      />
      <div className="p-4 space-y-3">

        {/* Media previews */}
        {mediaUrls.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {mediaUrls.map((url, index) => (
              <div key={index} className="relative">
                {url.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                  <img src={url} alt={`Media ${index + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                ) : (
                  <div className="w-20 h-20 bg-secondary rounded-lg flex items-center justify-center">
                    <File className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-destructive/90"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Single-line toolbar: channel, textbox (with emoji+attachment), then call/schedule/send */}
        <div className="flex gap-2 items-center">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as any)}
            className="h-9 px-3 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="FACEBOOK">Facebook</option>
            <option value="TWITTER">Twitter</option>
            <option value="SLACK">Slack</option>
          </select>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && channel !== 'EMAIL') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={channel === 'EMAIL' ? 'Email body...' : 'Type your message...'}
              className="w-full px-3 py-2 pr-24 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-5 resize-none"
              rows={channel === 'EMAIL' ? 2 : 1}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
              <EmojiPicker onSelect={handleEmojiSelect} />
              <label 
                className="h-7 w-7 p-0 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 cursor-pointer transition-colors flex items-center justify-center"
                title="Add attachment"
              >
                <Paperclip className="w-4 h-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Right-aligned actions: Call, Schedule, Send */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setShowCallDialog(true)}
              className="h-9 w-9 p-0 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center"
              title="Call options"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowScheduleDialog(true)}
              className="h-9 w-9 p-0 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center"
              title="Schedule message"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={(!content.trim() && mediaUrls.length === 0) || sendMessage.isPending}
              className="h-9 px-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ScheduleMessageDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSchedule={handleSchedule}
        />

        {/* Call Dialog */}
        <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Call this contact</DialogTitle>
              <DialogDescription>Place an immediate TTS call or schedule one with a script.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="block text-sm font-medium">Call script (spoken to the recipient)</label>
              <textarea
                value={callText}
                onChange={(e) => setCallText(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                rows={4}
                placeholder="Type what should be said during the call..."
              />
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/twilio/call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contactId, text: callText || undefined }),
                      });
                      if (!res.ok) throw new Error('Failed to initiate call');
                      toast.success('Call initiated');
                      setShowCallDialog(false);
                      setCallText('');
                    } catch (e) {
                      toast.error('Failed to initiate call');
                    }
                  }}
                >
                  Call Now (TTS)
                </button>
                <input
                  type="datetime-local"
                  value={callSchedule}
                  onChange={(e) => setCallSchedule(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <button
                  className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                  onClick={async () => {
                    if (!callSchedule) {
                      toast.error('Pick a schedule time');
                      return;
                    }
                    try {
                      const res = await fetch('/api/twilio/call/schedule', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contactId, text: callText || 'This is a scheduled call.', scheduledFor: new Date(callSchedule).toISOString() }),
                      });
                      if (!res.ok) throw new Error('Failed to schedule call');
                      toast.success('Call scheduled');
                      setShowCallDialog(false);
                      setCallText('');
                      setCallSchedule('');
                    } catch (e) {
                      toast.error('Failed to schedule call');
                    }
                  }}
                >
                  Schedule Call
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Live mic/browser calling requires Twilio Client setup. We can add it next.</p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
