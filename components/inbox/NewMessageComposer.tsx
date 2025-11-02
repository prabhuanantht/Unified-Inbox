'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createSender } from '@/lib/integrations';

interface NewMessageComposerProps {
  onClose: () => void;
}

export function NewMessageComposer({ onClose }: NewMessageComposerProps) {
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'FACEBOOK' | 'TWITTER' | 'INSTAGRAM' | 'SLACK'>('SMS');
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!recipient.trim() || !content.trim()) {
      toast.error('Please enter recipient and message');
      return;
    }

    setIsSending(true);
    try {
      // First, try to find existing contact
      let contact = null;
      
      // Search for existing contact based on channel
      if (channel === 'SMS' || channel === 'WHATSAPP') {
        const searchRes = await fetch('/api/contacts');
        if (searchRes.ok) {
          const contacts = await searchRes.json();
          contact = contacts.find((c: any) => c.phone === recipient);
        }
      } else if (channel === 'EMAIL') {
        const searchRes = await fetch('/api/contacts');
        if (searchRes.ok) {
          const contacts = await searchRes.json();
          contact = contacts.find((c: any) => c.email === recipient);
        }
      } else if (channel === 'FACEBOOK' || channel === 'TWITTER' || channel === 'INSTAGRAM') {
        const searchRes = await fetch('/api/contacts');
        if (searchRes.ok) {
          const contacts = await searchRes.json();
          contact = contacts.find((c: any) => {
            const handles = c.socialHandles as any;
            return handles?.facebook === recipient || 
                   handles?.twitter === recipient ||
                   handles?.instagram === recipient;
          });
        }
      }

      // Create contact if not found
      if (!contact) {
        const contactRes = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: recipient,
            phone: channel === 'SMS' || channel === 'WHATSAPP' ? recipient : undefined,
            email: channel === 'EMAIL' ? recipient : undefined,
            socialHandles: channel === 'FACEBOOK' ? { facebook: recipient } :
                           channel === 'TWITTER' ? { twitter: recipient } :
                           channel === 'INSTAGRAM' ? { instagram: recipient } :
                           channel === 'SLACK' ? { slack: recipient } : undefined,
          }),
        });

        if (!contactRes.ok) {
          throw new Error('Failed to create contact');
        }

        contact = await contactRes.json();
      }

      // Send message
      const messageRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          channel,
          content,
        }),
      });

      if (!messageRes.ok) {
        const errorData = await messageRes.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Failed to send message';
        console.error('Message send error:', errorMessage);
        throw new Error(errorMessage);
      }

      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      
      toast.success('Message sent successfully!');
      setContent('');
      setRecipient('');
      onClose();
    } catch (error) {
      toast.error(`Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const getPlaceholder = () => {
    switch (channel) {
      case 'SMS':
      case 'WHATSAPP':
        return 'Phone number (e.g., +1234567890)';
      case 'EMAIL':
        return 'Email address';
      case 'FACEBOOK':
        return 'Facebook PSID (from synced messages or Developer Tools)';
      case 'TWITTER':
        return 'Twitter User ID (from synced messages)';
      case 'INSTAGRAM':
        return 'Instagram User ID (from synced messages)';
      case 'SLACK':
        return 'Slack User ID or Channel ID (e.g., U1234567 or C1234567)';
      default:
        return 'Recipient';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">New Message</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
              <option value="FACEBOOK">Facebook Messenger</option>
              <option value="INSTAGRAM">Instagram Direct</option>
              <option value="TWITTER">Twitter DM</option>
              <option value="SLACK">Slack</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!recipient.trim() || !content.trim() || isSending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

