import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AuthState, User, UserRole } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userData: Omit<User, 'id'>) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isMember: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            const user: User = {
              id: firebaseUser.uid,
              ...userData,
            };
            
            setAuthState({
              isAuthenticated: true,
              user,
              isLoading: false,
              error: null,
            });
          } else {
            // User document doesn't exist, sign out
            await signOut(auth);
            setAuthState({
              isAuthenticated: false,
              user: null,
              isLoading: false,
              error: 'User data not found',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: 'Failed to load user data',
          });
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'id'>;
        const user: User = {
          id: firebaseUser.uid,
          ...userData,
        };
        
        setAuthState({
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error('User data not found');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      }
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const register = async (email: string, password: string, userData: Omit<User, 'id'>) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const user: User = {
        id: firebaseUser.uid,
        ...userData,
        dateJoined: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        dateJoined: user.dateJoined,
        avatarUrl: user.avatarUrl,
      });

      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'An error occurred during registration';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      }
      
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: errorMessage,
      });
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
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
        register,
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