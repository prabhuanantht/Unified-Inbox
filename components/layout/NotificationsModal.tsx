'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function NotificationsModal() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: open,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.read).length || 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-2 hover:bg-accent rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </span>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAllAsRead.mutate()}
                  className="h-8"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">Loading...</div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !notification.read
                      ? 'bg-primary/10 border-primary/20'
                      : 'bg-card border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell
                          className={`w-4 h-4 ${
                            !notification.read ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                        <h3 className="font-medium text-foreground">{notification.title}</h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-primary rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{notification.message}</p>
                      <p className="text-xs text-muted-foreground ml-6 mt-1">
                        {formatRelativeDate(new Date(notification.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead.mutate(notification.id)}
                          className="h-8 w-8"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification.mutate(notification.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

