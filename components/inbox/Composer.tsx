'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Calendar, Image, File } from 'lucide-react';
import { toast } from 'sonner';
import { EmojiPicker } from './EmojiPicker';
import { AISuggestions } from './AISuggestions';
import { ScheduleMessageDialog } from './ScheduleMessageDialog';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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

  return (
    <div className="border-t border-border bg-card">
      <AISuggestions
        contactId={contactId}
        onSelect={(suggestion) => setContent(suggestion)}
      />
      <div className="p-4 space-y-3">
        {/* Channel selector and scheduled indicator */}
        <div className="flex items-center justify-between">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as any)}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
          <option value="FACEBOOK">Facebook</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="TWITTER">Twitter</option>
          <option value="SLACK">Slack</option>
          </select>
          {scheduledFor && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs">
              <Calendar className="w-3 h-3" />
              <span>Scheduled: {new Date(scheduledFor).toLocaleString()}</span>
              <button
                onClick={() => setScheduledFor(null)}
                className="ml-2 hover:text-primary/80"
                title="Remove schedule"
              >
                ×
              </button>
            </div>
          )}
        </div>

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

        {/* Email subject field - only show for EMAIL channel */}
        {channel === 'EMAIL' && (
          <div className="space-y-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject (optional)"
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
              💡 <strong>Free tier note:</strong> With onboarding@resend.dev, you can only send to your own verified email address. To send to any recipient, verify a domain at <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">resend.com/domains</a> and set RESEND_FROM_EMAIL in .env
            </div>
          </div>
        )}

        {/* Message input area */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && channel !== 'EMAIL') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={channel === 'EMAIL' ? 'Email body...' : 'Type your message...'}
              className="w-full px-4 py-3 pr-20 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={channel === 'EMAIL' ? 5 : 3}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <EmojiPicker onSelect={handleEmojiSelect} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 items-end">
            <label 
              className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors"
              title="Upload image"
            >
              <Image className="w-4 h-4" />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <label 
              className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 cursor-pointer transition-colors"
              title="Upload file"
            >
              <Paperclip className="w-4 h-4" />
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <button 
              onClick={() => setShowScheduleDialog(true)}
              className="p-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
              title="Schedule message"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={(!content.trim() && mediaUrls.length === 0) || sendMessage.isPending}
              className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>
    </div>
  );
}
