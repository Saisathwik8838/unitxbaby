import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function SignOutButton() {
  const { signOut } = useAuth();
  
  return (
    <button
      onClick={() => signOut()}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
    >
      Sign Out
    </button>
  );
}

