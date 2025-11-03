'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Bell, Palette, Globe, Zap, Save } from 'lucide-react';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'appearance' | 'integrations'>('general');
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to update settings' }));
        throw new Error(errorData.error || 'Failed to update settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast.error(message);
      console.error('Settings save error:', error);
    },
  });

  const handleSave = (data: any) => {
    updateSettings.mutate(data);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Zap },
  ];

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <BackButton />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Settings</h1>

      <div className="flex gap-6">
        <div className="w-64 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 bg-card rounded-lg border border-border p-6">
          {activeTab === 'general' && (
            <GeneralSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'notifications' && (
            <NotificationSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'appearance' && (
            <AppearanceSettings settings={settings} onSave={handleSave} />
          )}
          {activeTab === 'integrations' && (
            <IntegrationSettings settings={settings} onSave={handleSave} />
          )}
        </div>
      </div>
      </div>
    </MainLayout>
  );
}

function GeneralSettings({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    aiSuggestions: true,
    autoReply: false,
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        language: settings.language || 'en',
        timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        aiSuggestions: settings.aiSuggestions ?? true,
        autoReply: settings.autoReply ?? false,
      });
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Language
            </label>
            <select
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI Message Suggestions
              </label>
              <p className="text-sm text-muted-foreground">
                Get AI-powered suggestions for replies
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.aiSuggestions}
                onChange={(e) => setFormData({ ...formData, aiSuggestions: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto Reply
              </label>
              <p className="text-sm text-muted-foreground">
                Automatically reply to incoming messages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoReply}
                onChange={(e) => setFormData({ ...formData, autoReply: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

          <Button
            onClick={() => onSave(formData)}
            className="mt-6"
          >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    emailNotifications: true,
    pushNotifications: true,
    soundEnabled: true,
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        emailNotifications: settings.emailNotifications ?? true,
        pushNotifications: settings.pushNotifications ?? true,
        soundEnabled: settings.soundEnabled ?? true,
      });
    }
  }, [settings]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Notifications
              </label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for new messages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailNotifications}
                onChange={(e) => setFormData({ ...formData, emailNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Push Notifications
              </label>
              <p className="text-sm text-muted-foreground">
                Receive browser push notifications
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pushNotifications}
                onChange={(e) => setFormData({ ...formData, pushNotifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sound Alerts
              </label>
              <p className="text-sm text-muted-foreground">
                Play sound when new messages arrive
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

          <Button
            onClick={() => onSave(formData)}
            className="mt-6"
          >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function AppearanceSettings({ settings, onSave }: any) {
  const [formData, setFormData] = useState({
    theme: settings?.theme || 'light',
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Appearance</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-4">
              {['light', 'dark', 'auto'].map((theme) => (
                <button
                  key={theme}
                  onClick={() => setFormData({ ...formData, theme })}
                  className={`p-4 border-2 rounded-lg text-center capitalize ${
                    formData.theme === theme
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </div>

          <Button
            onClick={() => onSave(formData)}
            className="mt-6"
          >
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function IntegrationSettings({ settings, onSave }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Integrations</h2>
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Twilio (SMS/WhatsApp)</h3>
              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs rounded">Connected</span>
            </div>
            <p className="text-sm text-muted-foreground">Configured via environment variables</p>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Email (Resend)</h3>
              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">Not Configured</span>
            </div>
            <p className="text-sm text-muted-foreground">Add RESEND_API_KEY to enable</p>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Twitter</h3>
              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">Not Configured</span>
            </div>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>

          <div className="p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground">Facebook</h3>
              <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded">Not Configured</span>
            </div>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}

