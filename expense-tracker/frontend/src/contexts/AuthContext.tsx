import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  username?: string;
  email?: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth]);

  const checkAuth = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
      setHasCheckedAuth(true);
    }
  };

  const login = async (username: string, password: string) => {
    const userData = await authApi.login(username, password);
    setUser(userData);
    setHasCheckedAuth(true);
    setLoading(false);
    // Give the browser a moment to process the cookie, then verify it works
    await new Promise(resolve => setTimeout(resolve, 200));
    // Verify the cookie is working by making a test request
    try {
      await authApi.getCurrentUser();
    } catch (error) {
      // If verification fails, clear user state - cookie might not be set correctly
      console.error('Cookie verification failed after login', error);
      setUser(null);
      setHasCheckedAuth(false);
      throw new Error('Authentication cookie was not set correctly. Please try again.');
    }
  };

  const googleLogin = async (idToken: string) => {
    const userData = await authApi.googleLogin(idToken);
    setUser(userData);
    setHasCheckedAuth(true);
    setLoading(false);
    // Give the browser a moment to process the cookie, then verify it works
    await new Promise(resolve => setTimeout(resolve, 200));
    // Verify the cookie is working by making a test request
    try {
      await authApi.getCurrentUser();
    } catch (error) {
      // If verification fails, clear user state - cookie might not be set correctly
      console.error('Cookie verification failed after Google login', error);
      setUser(null);
      setHasCheckedAuth(false);
      throw new Error('Authentication cookie was not set correctly. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        googleLogin,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
