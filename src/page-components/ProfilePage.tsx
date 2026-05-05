'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import authService from '@/lib/appwrite/auth';
import appwriteService from '@/lib/appwrite/appwriteService';
import { toastStyle } from '@/lib/utils';
import AuthGuard from '@/components/client/AuthGuard';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-edge rounded-2xl p-6">
      <h2 className="text-sm font-medium text-ink mb-5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 text-sm bg-card border border-edge rounded-lg text-ink
        placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ink/30
        disabled:opacity-50 disabled:cursor-not-allowed transition ${props.className ?? ''}`}
    />
  );
}

function SaveBtn({ loading, label = 'Save changes' }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-4 py-2 text-xs font-medium rounded-lg bg-ink text-base
        hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
      {loading ? 'Saving...' : label}
    </button>
  );
}

function NameForm({ currentName }: { currentName: string }) {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { name: currentName } });

  const onSubmit = async ({ name }: { name: string }) => {
    if (name.trim() === currentName) return;
    setLoading(true);
    try {
      await authService.updateName(name.trim());
      // Re-fetch user to update Redux state
      const user = await authService.getCurrentUser();
      if (user) dispatch({ type: 'auth/login', payload: user });
      toast.success('Name updated', { style: toastStyle });
    } catch {
      toast.error('Failed to update name', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field label="Display name">
        <Input
          {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })}
          placeholder="Your name"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </Field>
      <SaveBtn loading={loading} />
    </form>
  );
}

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { email: currentEmail, password: '' },
  });

  const onSubmit = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    try {
      await authService.updateEmail(email.trim(), password);
      reset({ email: email.trim(), password: '' });
      toast.success('Email updated', { style: toastStyle });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update email';
      toast.error(msg.includes('password') ? 'Incorrect password' : 'Failed to update email', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field label="Email address">
        <Input
          {...register('email', { required: true, pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
          type="email"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </Field>
      <Field label="Current password (required to change email)">
        <Input
          {...register('password', { required: 'Password is required' })}
          type="password"
          placeholder="Your current password"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
      </Field>
      <SaveBtn loading={loading} />
    </form>
  );
}

function PasswordForm() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { current: '', next: '', confirm: '' },
  });
  const nextVal = watch('next');

  const onSubmit = async ({ current, next }: { current: string; next: string; confirm: string }) => {
    setLoading(true);
    try {
      await authService.updatePassword(next, current);
      reset();
      toast.success('Password updated', { style: toastStyle });
    } catch {
      toast.error('Incorrect current password', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Field label="Current password">
        <Input
          {...register('current', { required: 'Required' })}
          type="password"
          placeholder="Current password"
        />
        {errors.current && <p className="text-xs text-red-500 mt-1">{errors.current.message}</p>}
      </Field>
      <Field label="New password">
        <Input
          {...register('next', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })}
          type="password"
          placeholder="New password"
        />
        {errors.next && <p className="text-xs text-red-500 mt-1">{errors.next.message}</p>}
      </Field>
      <Field label="Confirm new password">
        <Input
          {...register('confirm', {
            required: 'Required',
            validate: (v) => v === nextVal || 'Passwords do not match',
          })}
          type="password"
          placeholder="Repeat new password"
        />
        {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
      </Field>
      <SaveBtn loading={loading} label="Update password" />
    </form>
  );
}

function DangerZone({ userId }: { userId: string }) {
  const [deletingPosts, setDeletingPosts] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState<'idle' | 'confirm-posts' | 'confirm-account'>('idle');
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleDeletePosts = async () => {
    setDeletingPosts(true);
    try {
      const posts = await appwriteService.getUserPosts(userId);
      await Promise.allSettled(
        posts.map((p) => appwriteService.adminDeletePost(p.$id)),
      );
      setStep('idle');
      toast.success(`Deleted ${posts.length} post${posts.length !== 1 ? 's' : ''}`, { style: toastStyle });
    } catch {
      toast.error('Failed to delete some posts', { style: toastStyle });
    } finally {
      setDeletingPosts(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'delete my account') return;
    setDeletingAccount(true);
    try {
      // Delete all posts first
      const posts = await appwriteService.getUserPosts(userId);
      await Promise.allSettled(posts.map((p) => appwriteService.adminDeletePost(p.$id)));
      // Deactivate account (sessions deleted)
      await authService.deleteAccount();
      dispatch(logout());
      router.push('/');
      toast.success('Account deleted', { style: toastStyle });
    } catch {
      toast.error('Failed to delete account', { style: toastStyle });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="border border-red-500/20 rounded-2xl p-6">
      <h2 className="text-sm font-medium text-red-500/80 mb-1">Danger zone</h2>
      <p className="text-xs text-muted mb-5">These actions are permanent and cannot be undone.</p>

      <div className="space-y-4">
        {/* Delete posts */}
        {step !== 'confirm-account' && (
          <div className="flex items-start justify-between gap-4 py-4 border-t border-edge">
            <div>
              <p className="text-sm font-medium text-ink mb-0.5">Delete all my posts</p>
              <p className="text-xs text-muted">Removes all posts and their associated images from storage.</p>
            </div>
            {step === 'confirm-posts' ? (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setStep('idle')}
                  className="px-3 py-1.5 text-xs rounded-lg border border-edge text-muted hover:text-ink transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePosts}
                  disabled={deletingPosts}
                  className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20
                    hover:bg-red-500/20 disabled:opacity-40 transition"
                >
                  {deletingPosts ? 'Deleting...' : 'Confirm'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep('confirm-posts')}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-500/20 text-red-400/80
                  hover:border-red-500/40 hover:text-red-400 transition flex-shrink-0"
              >
                Delete posts
              </button>
            )}
          </div>
        )}

        {/* Delete account */}
        {step !== 'confirm-posts' && (
          <div className="flex items-start justify-between gap-4 py-4 border-t border-edge">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink mb-0.5">Delete account</p>
              <p className="text-xs text-muted">Permanently removes your account and all your posts.</p>
              {step === 'confirm-account' && (
                <div className="mt-3">
                  <p className="text-xs text-muted mb-1.5">
                    Type <span className="text-ink font-mono">delete my account</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="delete my account"
                    className="w-full px-3 py-2 text-sm bg-card border border-red-500/20 rounded-lg text-ink
                      placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-red-500/30"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setStep('idle'); setConfirmText(''); }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-edge text-muted hover:text-ink transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={confirmText !== 'delete my account' || deletingAccount}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20
                        hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {deletingAccount ? 'Deleting...' : 'Delete account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {step !== 'confirm-account' && (
              <button
                onClick={() => setStep('confirm-account')}
                className="px-3 py-1.5 text-xs rounded-lg border border-red-500/20 text-red-400/80
                  hover:border-red-500/40 hover:text-red-400 transition flex-shrink-0"
              >
                Delete account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileContent() {
  const userData = useAppSelector((state) => state.auth.userData);

  if (!userData) return null;

  const initials = userData.name
    ? userData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : userData.email[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-12 h-12 rounded-full bg-subtle border border-edge flex items-center justify-center
          text-lg font-medium text-ink flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-base font-medium text-ink">{userData.name || 'No name set'}</p>
          <p className="text-sm text-muted">{userData.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Section title="Display name">
          <NameForm currentName={userData.name ?? ''} />
        </Section>

        <Section title="Email address">
          <EmailForm currentEmail={userData.email} />
        </Section>

        <Section title="Password">
          <PasswordForm />
        </Section>

        <DangerZone userId={userData.$id} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
