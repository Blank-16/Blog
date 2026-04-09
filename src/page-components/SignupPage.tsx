import AuthGuard from '@/components/client/AuthGuard';
import SignupForm from '@/components/client/SignupForm';

export default function SignupPage() {
  return (
    <AuthGuard authentication={false}>
      <div className="py-8">
        <SignupForm />
      </div>
    </AuthGuard>
  );
}
