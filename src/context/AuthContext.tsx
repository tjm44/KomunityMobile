import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client, { loadToken, clearToken, onAuthExpired } from '../api/client';
import type { UserProfile } from '../types';

export type { UserProfile };

interface AuthContextType {
  isLoggedIn: boolean;
  isCheckingAuth: boolean;
  userProfile: UserProfile | null;
  needsProfileSetup: boolean;
  sessionNotice: string | null;
  unreadNotificationCount: number;
  setNeedsProfileSetup: (value: boolean) => void;
  setSessionNotice: (value: string | null) => void;
  checkProfileStatus: () => Promise<UserProfile | null>;
  handleLoginSuccess: () => Promise<void>;
  handlePhoneAuthSuccess: (isNewUser?: boolean) => Promise<void>;
  handleSignUpSuccess: () => Promise<void>;
  handleLogout: () => Promise<void>;
  fetchUnreadNotificationCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchUnreadNotificationCount = useCallback(async () => {
    try {
      const notifRes = await client.get('notifications/unread_count/');
      setUnreadNotificationCount(notifRes.data.unread_count || 0);
    } catch (err) {
      console.log('Error fetching unread notification count:', err);
    }
  }, []);

  const checkProfileStatus = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const response = await client.get('profiles/me/');
      const profile = response.data;
      setUserProfile(profile);
      if (!profile.is_complete) {
        setNeedsProfileSetup(true);
      } else {
        setNeedsProfileSetup(false);
      }
      return profile;
    } catch (error) {
      console.error('Error checking profile status:', error);
      return null;
    }
  }, []);

  // Auto-login: try to restore session from secure storage on launch
  useEffect(() => {
    const tryAutoLogin = async () => {
      try {
        const token = await loadToken();
        if (token) {
          const response = await client.get('profiles/me/');
          setUserProfile(response.data);
          if (!response.data.is_complete) {
            setNeedsProfileSetup(true);
          }
          setIsLoggedIn(true);
          fetchUnreadNotificationCount();
        }
      } catch (error) {
        console.log('Auto-login failed, showing login screen');
        await clearToken();
      } finally {
        setIsCheckingAuth(false);
      }
    };
    tryAutoLogin();
  }, [fetchUnreadNotificationCount]);

  // Listen for 401 token expiration and securely redirect to login
  useEffect(() => {
    const unsubscribe = onAuthExpired((reason) => {
      setIsLoggedIn(false);
      setUserProfile(null);
      if (reason === 'session_expired') {
        setSessionNotice('🛡️ For your security, your session has expired due to inactivity. Please sign in again.');
      }
    });
    return unsubscribe;
  }, []);

  const handleLoginSuccess = useCallback(async () => {
    await checkProfileStatus();
    setIsLoggedIn(true);
    fetchUnreadNotificationCount();
  }, [checkProfileStatus, fetchUnreadNotificationCount]);

  const handlePhoneAuthSuccess = useCallback(async (isNewUser?: boolean) => {
    await checkProfileStatus();
    if (isNewUser) {
      setNeedsProfileSetup(true);
    }
    setIsLoggedIn(true);
    fetchUnreadNotificationCount();
  }, [checkProfileStatus, fetchUnreadNotificationCount]);

  const handleSignUpSuccess = useCallback(async () => {
    setNeedsProfileSetup(true);
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(async () => {
    console.log('AuthContext: Logging out...');
    await clearToken();
    setIsLoggedIn(false);
    setUserProfile(null);
    setNeedsProfileSetup(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isCheckingAuth,
        userProfile,
        needsProfileSetup,
        sessionNotice,
        unreadNotificationCount,
        setNeedsProfileSetup,
        setSessionNotice,
        checkProfileStatus,
        handleLoginSuccess,
        handlePhoneAuthSuccess,
        handleSignUpSuccess,
        handleLogout,
        fetchUnreadNotificationCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
