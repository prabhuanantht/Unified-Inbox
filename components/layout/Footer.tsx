'use client';

import { MessageSquare, Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">Unified Inbox</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Multi-channel communication platform for managing all your customer conversations in one place.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
                  Settings
                </a>
              </li>
              <li>
                <a href="/profile" className="text-muted-foreground hover:text-foreground transition-colors">
                  Profile
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex gap-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              © {new Date().getFullYear()} Unified Inbox. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

