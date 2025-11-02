'use client';

import { useState } from 'react';
import { InboxView } from '@/components/inbox/InboxView';
import { ContactsView } from '@/components/contacts/ContactsView';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainLayout } from '@/components/layout/MainLayout';

export default function DashboardPage() {
  const [selectedView, setSelectedView] = useState<'inbox' | 'contacts' | 'analytics'>('inbox');

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar selectedView={selectedView} onViewChange={setSelectedView} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {selectedView === 'inbox' && <InboxView />}
            {selectedView === 'contacts' && <ContactsView />}
            {selectedView === 'analytics' && <AnalyticsDashboard />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
