import Link from 'next/link';
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
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:text-primary-hover">
            Sign up
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
