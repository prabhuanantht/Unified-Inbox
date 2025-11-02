'use client';

import { useState } from 'react';
import { Plus, X, Send } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function NewMessageButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'FACEBOOK' | 'TWITTER' | 'INSTAGRAM'>('SMS');
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (data: { recipient: string; channel: string; content: string }) => {
      // First, find or create contact
      const contactsRes = await fetch('/api/contacts');
      const contacts = contactsRes.ok ? await contactsRes.json() : [];
      
      let contact = null;
      
      // Search for existing contact
      if (data.channel === 'SMS' || data.channel === 'WHATSAPP') {
        contact = contacts.find((c: any) => c.phone === data.recipient);
      } else if (data.channel === 'EMAIL') {
        contact = contacts.find((c: any) => c.email === data.recipient);
      } else {
        const socialHandles = data.channel === 'FACEBOOK' ? { facebook: data.recipient } :
                            data.channel === 'TWITTER' ? { twitter: data.recipient } :
                            { instagram: data.recipient };
        contact = contacts.find((c: any) => {
          const handles = c.socialHandles as any;
          return handles?.facebook === data.recipient || 
                 handles?.twitter === data.recipient || 
                 handles?.instagram === data.recipient;
        });
      }

      // Create contact if not found
      if (!contact) {
        const contactData: any = {
          name: data.recipient,
        };
        
        if (data.channel === 'SMS' || data.channel === 'WHATSAPP') {
          contactData.phone = data.recipient;
        } else if (data.channel === 'EMAIL') {
          contactData.email = data.recipient;
        } else {
          contactData.socialHandles = 
            data.channel === 'FACEBOOK' ? { facebook: data.recipient } :
            data.channel === 'TWITTER' ? { twitter: data.recipient } :
            { instagram: data.recipient };
        }

        const createRes = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contactData),
        });
        
        if (!createRes.ok) throw new Error('Failed to create contact');
        contact = await createRes.json();
      }

      // Send message
      const messageRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          channel: data.channel,
          content: data.content,
        }),
      });

      if (!messageRes.ok) {
        const error = await messageRes.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return messageRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Message sent successfully!');
      setIsOpen(false);
      setRecipient('');
      setContent('');
    },
    onError: (error) => {
      toast.error(`Failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const handleSend = () => {
    if (!recipient.trim() || !content.trim()) {
      toast.error('Please enter recipient and message');
      return;
    }
    sendMessage.mutate({ recipient, channel, content });
  };

  const getPlaceholder = () => {
    switch (channel) {
      case 'SMS':
      case 'WHATSAPP':
        return 'Phone number (e.g., +1234567890)';
      case 'EMAIL':
        return 'Email address';
      case 'FACEBOOK':
        return 'Facebook PSID (Page-Scoped ID)';
      case 'TWITTER':
        return 'Twitter User ID';
      case 'INSTAGRAM':
        return 'Instagram User ID';
      default:
        return 'Recipient';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center z-50"
        title="New Message"
      >
        <Plus className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">New Message</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Channel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SMS">SMS</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="FACEBOOK">Facebook Messenger</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TWITTER">Twitter</option>
              </select>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {channel === 'FACEBOOK' && 'Enter the Facebook PSID from synced messages or Facebook Developer Tools'}
                {channel === 'INSTAGRAM' && 'Enter the Instagram User ID from synced messages'}
                {channel === 'TWITTER' && 'Enter the Twitter User ID from synced messages'}
              </p>
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!recipient.trim() || !content.trim() || sendMessage.isPending}
              className={cn(
                "w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              )}
            >
              {sendMessage.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

