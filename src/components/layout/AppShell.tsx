'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Bot,
  Megaphone,
  PhoneCall,
  Wallet,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// lucide-react icon components can't cross the server->client boundary as
// props (they're functions), so nav config lives here and layouts just pick
// a section name.
const NAV_SECTIONS = {
  admin: [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/agents', label: 'Agents', icon: Bot },
    { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/admin/calls', label: 'Calls', icon: PhoneCall },
  ],
  dashboard: [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/dashboard/calls', label: 'Calls', icon: PhoneCall },
    { href: '/dashboard/agents', label: 'Agents', icon: Bot },
    { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/developer', label: 'Developer', icon: Code2 },
  ],
} as const;

export function AppShell({
  section,
  brandName,
  roleLabel,
  userName,
  userEmail,
  children,
}: {
  section: keyof typeof NAV_SECTIONS;
  brandName: string;
  roleLabel: string;
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = NAV_SECTIONS[section];

  const isActive = (href: string) => (href === navItems[0].href ? pathname === href : pathname.startsWith(href));

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const nav = (
    <>
      <div className="flex h-14 items-center gap-2 px-4">
        <img src="/logo.svg" alt={brandName} className="size-7 rounded-lg object-contain" />
        <span className="text-sm font-semibold tracking-tight text-foreground">{brandName}</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2.5 py-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-soft text-primary-hover'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              )}
            >
              <item.icon className={cn('size-4', active ? 'text-primary-hover' : 'text-muted-foreground')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-hover">
            {initials || 'U'}
          </div>
          <div className="min-w-0 flex-1" title={userEmail}>
            <p className="truncate text-xs font-medium text-foreground">{userName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-danger"
          >
            <LogOut className="size-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">{nav}</aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-60 flex-col bg-surface">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3.5 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
            >
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt={brandName} className="size-6 rounded-md object-contain" />
            <span className="text-sm font-semibold">{brandName}</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden px-4 py-5 md:px-7 md:py-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
