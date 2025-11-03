'use client';

import { Search, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { NotificationsModal } from './NotificationsModal';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const initialQ = searchParams?.get('q') || '';
  const [value, setValue] = useState(initialQ);

  // Keep local state in sync when route changes externally
  useEffect(() => {
    setValue(initialQ);
  }, [initialQ]);

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === null || val === '') params.delete(key);
        else params.set(key, val);
      });
      return params.toString();
    },
    [searchParams]
  );

  // Debounce updating the URL for better UX
  const debouncedUpdate = useMemo(() => {
    let t: any;
    return (next: string) => {
      clearTimeout(t);
      t = setTimeout(() => {
        const qs = createQueryString({ q: next || null });
        router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
      }, 250);
    };
  }, [createQueryString, pathname, router]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);
    debouncedUpdate(next);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = createQueryString({ q: value || null });
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <span className="text-xl font-bold text-foreground">Unified Inbox</span>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          <form onSubmit={onSubmit} className="relative hidden md:block max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={value}
              onChange={onChange}
              placeholder="Search contacts, messages..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
          </form>

          <div className="flex items-center gap-2">
            <NotificationsModal />
            <Link
              href="/profile"
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <User className="w-5 h-5 text-foreground" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
