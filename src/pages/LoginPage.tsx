import AuthGuard from '@/components/client/AuthGuard';
import LoginForm from '@/components/client/LoginForm';

export default function LoginPage() {
  return (
    <AuthGuard authentication={false}>
      <div className="py-8">
        <LoginForm />
      </div>
    </AuthGuard>
  );
}
