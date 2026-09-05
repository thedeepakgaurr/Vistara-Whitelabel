import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider } from '@/components/ui/Toast';
import { getCurrentUser } from '@/lib/auth';

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'CallDesk';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'admin') redirect('/login');

  return (
    <ToastProvider>
      <AppShell section="admin" brandName={brandName} roleLabel="Admin" userName={admin.name} userEmail={admin.email}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
