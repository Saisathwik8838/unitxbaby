import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    const errorParam = urlParams.get('error');
    
    if (sessionParam) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionParam));
        localStorage.setItem('github_session', JSON.stringify(sessionData));
        setSession(sessionData);
        setStatus('authenticated');
        window.history.replaceState({}, document.title, '/');
      } catch (error) {
        console.error('Failed to parse session:', error);
        setStatus('unauthenticated');
      }
    } else if (errorParam) {
      console.error('OAuth error:', decodeURIComponent(errorParam));
      setStatus('unauthenticated');
      window.history.replaceState({}, document.title, '/');
    } else {
      try {
        const storedSession = localStorage.getItem('github_session');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          setSession(parsed);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        localStorage.removeItem('github_session');
        setStatus('unauthenticated');
      }
    }
  }, []);

  const signIn = async () => {
    try {
      const clientId = import.meta.env.VITE_GITHUB_ID;
      if (!clientId) {
        alert('GitHub Client ID not configured');
        return;
      }
      
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
      const redirectUri = `${backendUrl}/api/auth/callback`;
      const scope = 'read:user user:email repo';
      const state = Math.random().toString(36).substring(7);
      
      localStorage.setItem('github_oauth_state', state);
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Failed to initiate sign in');
    }
  };

  const signOut = () => {
    localStorage.removeItem('github_session');
    localStorage.removeItem('github_oauth_state');
    setSession(null);
    setStatus('unauthenticated');
  };

  return (
    <AuthContext.Provider value={{ session, signIn, signOut, status }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
