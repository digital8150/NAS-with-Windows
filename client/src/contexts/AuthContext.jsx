import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuthStatus, login as apiLogin, logout as apiLogout, setupPassword as apiSetupPassword } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [serverName, setServerName] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 보안 및 브루트포스 잠금 상태
  const [isLocked, setIsLocked] = useState(false);
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  const checkAuth = useCallback(async () => {
    try {
      const data = await getAuthStatus();
      setAuthenticated(data.authenticated);
      setNeedsSetup(Boolean(data.needsSetup));
      if (data.serverName) {
        setServerName(data.serverName);
      }
      setUser(data.user);
      if (data.security) {
        setIsLocked(data.security.isLocked);
        setRemainingLockSeconds(data.security.remainingLockSeconds);
        setRemainingAttempts(data.security.remainingAttempts);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 잠금 상태일 때 1초마다 카운트다운
  useEffect(() => {
    if (!isLocked || remainingLockSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingLockSeconds(prev => {
        if (prev <= 1) {
          setIsLocked(false);
          checkAuth();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, remainingLockSeconds, checkAuth]);

  const login = async (password) => {
    try {
      const result = await apiLogin(password);
      setAuthenticated(true);
      setNeedsSetup(false);
      setUser(result.user);
      setIsLocked(false);
      setRemainingAttempts(5);
      return result;
    } catch (err) {
      if (err.data) {
        if (err.data.isLocked) {
          setIsLocked(true);
          setRemainingLockSeconds(err.data.remainingLockSeconds || 900);
        }
        if (err.data.remainingAttempts !== undefined) {
          setRemainingAttempts(err.data.remainingAttempts);
        }
      }
      throw err;
    }
  };

  const setup = async (password) => {
    const result = await apiSetupPassword(password);
    setAuthenticated(true);
    setNeedsSetup(false);
    setUser(result.user);
    setIsLocked(false);
    setRemainingAttempts(5);
    return result;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setAuthenticated(false);
      setUser(null);
      checkAuth();
    }
  };

  return (
    <AuthContext.Provider value={{
      authenticated,
      needsSetup,
      serverName,
      user,
      loading,
      isLocked,
      remainingLockSeconds,
      remainingAttempts,
      login,
      setup,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
