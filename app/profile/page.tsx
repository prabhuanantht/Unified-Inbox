'use client';

import { useState } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserIcon, Mail, Shield, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/user');
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  const updateUser = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Profile updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(message);
      console.error('Profile update error:', error);
    },
  });

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: (user?.role || 'EDITOR') as 'VIEWER' | 'EDITOR' | 'ADMIN',
  });

  // Update form data when user data loads (using useEffect to avoid setState in render)
  React.useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: (user.role || 'EDITOR') as 'VIEWER' | 'EDITOR' | 'ADMIN',
      });
    }
  }, [user]);

  const handleSave = () => {
    updateUser.mutate(formData);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Profile</h1>

        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center">
                <UserIcon className="w-12 h-12 text-primary" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{user?.name || 'User'}</h2>
              <p className="text-muted-foreground">{user?.email || 'No email'}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-primary/20 text-primary text-sm rounded-full">
                {user?.role || 'EDITOR'}
              </span>
            </div>
          </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'VIEWER' | 'EDITOR' | 'ADMIN' })}
                className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formData.role === 'VIEWER' && 'Can view messages and contacts only'}
              {formData.role === 'EDITOR' && 'Can view and send messages, manage contacts'}
              {formData.role === 'ADMIN' && 'Full access to all features and settings'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
      </div>
    </MainLayout>
  );
}

