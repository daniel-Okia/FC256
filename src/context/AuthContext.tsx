import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User, UserRole } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isMember: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: Record<string, User> = {
  'admin@fitholicsfc.com': {
    id: '1',
    name: 'Admin User',
    email: 'admin@fitholicsfc.com',
    role: 'admin',
    dateJoined: new Date().toISOString(),
  },
  'manager@fitholicsfc.com': {
    id: '2',
    name: 'Manager User',
    email: 'manager@fitholicsfc.com',
    role: 'manager',
    dateJoined: new Date().toISOString(),
  },
  'member@fitholicsfc.com': {
    id: '3',
    name: 'Member User',
    email: 'member@fitholicsfc.com',
    role: 'member',
    dateJoined: new Date().toISOString(),
  },
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock authentication
      const user = MOCK_USERS[email.toLowerCase()];
      if (user && password === 'password') {
        localStorage.setItem('user', JSON.stringify(user));
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
        });
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: 'Invalid email or password',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'An error occurred during login',
      });
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: null,
    });
  };

  const isAdmin = (): boolean => {
    return authState.user?.role === 'admin';
  };

  const isManager = (): boolean => {
    return authState.user?.role === 'manager';
  };

  const isMember = (): boolean => {
    return authState.user?.role === 'member';
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        isAdmin,
        isManager,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};