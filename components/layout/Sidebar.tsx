'use client';

import Link from 'next/link';
import { MessageSquare, Users, BarChart3, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  selectedView: string;
  onViewChange: (view: 'inbox' | 'contacts' | 'analytics') => void;
}

export function Sidebar({ selectedView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: MessageSquare },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onViewChange(item.id as any)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    selectedView === item.id
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Link
          href="/settings"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
        <Link
          href="/profile"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <User className="w-5 h-5" />
          <span className="font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
}
