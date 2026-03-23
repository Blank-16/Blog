import type { Metadata } from 'next';
import AuthGuard from '@/components/AuthGuard';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Login – Blogging Web' };

export default function LoginPage() {
  return (
    <AuthGuard authentication={false}>
      <div className="py-8">
        <LoginForm />
      </div>
    </AuthGuard>
  );
}
