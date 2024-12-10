import Form from 'next/form';

import { signOut } from '@/app/(auth)/auth';

export const SignOutForm = () => {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    'use server';

    await signOut({
      redirectTo: '/',
    });
  };

  return (
    <Form 
    action="/dummy-action"
    className="w-full" 
    onSubmit={handleSubmit}>
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </Form>
  );
};
