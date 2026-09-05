import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'CallDesk';

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'admin') redirect('/admin');

  return (
    <ToastProvider>
      <AppShell section="dashboard" brandName={brandName} roleLabel="Account" userName={user.name} userEmail={user.email}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
