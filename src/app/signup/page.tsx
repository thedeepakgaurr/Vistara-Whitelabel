import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from '@/components/auth/SignupForm';

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'CallDesk';

export default function SignupPage() {
  return (
    <AuthShell
      brandName={brandName}
      title={`Create your ${brandName} account`}
      subtitle="Get an API key and start placing AI voice calls"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
