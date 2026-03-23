import type { Metadata } from 'next';
import AuthGuard from '@/components/AuthGuard';
import SignupForm from '@/components/SignupForm';

export const metadata: Metadata = { title: 'Sign Up – Blogging Web' };

export default function SignupPage() {
  return (
    <AuthGuard authentication={false}>
      <div className="py-8">
        <SignupForm />
      </div>
    </AuthGuard>
  );
}
