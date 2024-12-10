'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { login, type LoginActionState } from '../actions';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [status, setStatus] = useState<LoginActionState['status']>('idle');

  useEffect(() => {
    if (status === 'failed') {
      toast.error('Invalid credentials!');
    } else if (status === 'invalid_data') {
      toast.error('Failed validating your submission!');
    } else if (status === 'success') {
      setIsSuccessful(true);
      router.refresh();
    }
  }, [status, router]);

  const handleSubmit = async (formData: FormData) => {
    try {
      setEmail(formData.get('email') as string);
      setStatus('in_progress'); // Fixed type to match LoginActionState
      const result = await login({ status: 'in_progress' }, formData); // Pass placeholder state for first argument
  
      if (result.status === 'success') {
        setStatus('success');
      } else if (result.status === 'invalid_data') {
        setStatus('invalid_data');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      setStatus('failed');
      console.error('Error submitting form:', error);
    }
  };
  

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Sign in</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign up
            </Link>
            {' for free.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
