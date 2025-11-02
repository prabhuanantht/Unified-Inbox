'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Mail, Phone, Tag, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ContactsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const queryClient = useQueryClient();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - contacts don't change often
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete contact');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
      setSelectedContact(null);
    },
    onError: () => {
      toast.error('Failed to delete contact');
    },
  });

  const filteredContacts = contacts?.filter((contact: any) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
  });

  const contact = selectedContact
    ? contacts?.find((c: any) => c.id === selectedContact)
    : null;

  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">Contacts</h2>
            <button
              onClick={() => setShowNewContact(true)}
              className="ml-auto p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : filteredContacts?.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts?.map((contact: any) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact.id);
                    setShowNewContact(false);
                  }}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                    selectedContact === contact.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {contact.name || 'Unnamed Contact'}
                      </h3>
                      <div className="mt-1 space-y-1">
                        {contact.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </p>
                        )}
                        {contact.email && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </p>
                        )}
                      </div>
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {contact.tags.slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {showNewContact ? (
          <NewContactForm
            onClose={() => setShowNewContact(false)}
            onSuccess={() => {
              setShowNewContact(false);
              queryClient.invalidateQueries({ queryKey: ['contacts'] });
            }}
          />
        ) : contact ? (
          <ContactDetail
            contact={contact}
            onDelete={() => deleteContact.mutate(contact.id)}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ['contacts'] })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a contact to view details
          </div>
        )}
      </div>
    </div>
  );
}

function NewContactForm({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');

  const createContact = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Contact created successfully');
      onSuccess();
    },
    onError: () => {
      toast.error('Failed to create contact');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContact.mutate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-foreground">New Contact</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add a tag"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        tags: formData.tags.filter((t) => t !== tag),
                      })
                    }
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create Contact
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactDetail({ contact, onDelete, onUpdate }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: contact.name || '',
    phone: contact.phone || '',
    email: contact.email || '',
    tags: contact.tags || [],
  });

  const updateContact = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update contact');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Contact updated successfully');
      setIsEditing(false);
      onUpdate();
    },
    onError: () => {
      toast.error('Failed to update contact');
    },
  });

  const handleSave = () => {
    updateContact.mutate(formData);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">{contact.name || 'Unnamed Contact'}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 text-muted-foreground hover:bg-accent rounded-lg"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-foreground">{contact.name || 'No name'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Phone
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-gray-900 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {contact.phone || 'No phone'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-gray-900 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {contact.email || 'No email'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tags
            </label>
            {contact.tags && contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No tags</p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

