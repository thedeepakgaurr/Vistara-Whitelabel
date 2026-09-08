import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'CallDesk';

export default function LoginPage() {
  return (
    <AuthShell
      brandName={brandName}
      title={`Sign in to ${brandName}`}
      subtitle="Welcome back — enter your details to continue"
      footer={
        <p className="text-xs text-muted-foreground">
          Access is invite-only. Contact your administrator for an account.
        </p>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
