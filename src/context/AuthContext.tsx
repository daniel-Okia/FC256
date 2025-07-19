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

  const createDefaultUserDocument = async (firebaseUser: FirebaseUser): Promise<User> => {
    if (!db) {
      throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
    }

    // Try to find matching member data first
    let memberData = null;
    try {
      const { MemberService } = await import('../services/firestore');
      const members = await MemberService.getAllMembers();
      memberData = members.find(member => 
        member.email.toLowerCase().trim() === (firebaseUser.email || '').toLowerCase().trim()
      );
      console.log('Found member data for user:', memberData ? memberData.name : 'No member data found');
    } catch (error) {
      console.warn('Could not fetch member data during user creation:', error);
    }

    const defaultUserData = {
      name: memberData ? memberData.name : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'),
      email: firebaseUser.email || '',
      role: 'member' as UserRole,
      phone: memberData ? (memberData.phone || '') : '',
      dateJoined: new Date().toISOString(),
      avatarUrl: firebaseUser.photoURL || '',
    };

    try {
      // Create the user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), defaultUserData);

      return {
        id: firebaseUser.uid,
        ...defaultUserData,
      };
    } catch (error) {
      console.error('Error creating user document:', error);
      throw new Error('Failed to create user profile. Please try again.');
    }
  };

  useEffect(() => {
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: 'Firebase configuration error. Please check your setup.',
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          if (!db) {
            throw new Error('Firestore is not initialized');
          }

          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          let user: User;
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as Omit<User, 'id'>;
            user = {
              id: firebaseUser.uid,
              ...userData,
            };
          } else {
            // User document doesn't exist, create one with default values
            console.log('User document not found, creating default document for:', firebaseUser.email);
            user = await createDefaultUserDocument(firebaseUser);
          }
          
          setAuthState({
            isAuthenticated: true,
            user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Error fetching user data:', error);
          let errorMessage = 'Failed to load user data';
          
          if (error.code === 'permission-denied') {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (error.code === 'not-found') {
            errorMessage = 'User profile not found. Please contact support.';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: errorMessage,
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
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please check your configuration.');
    }

    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (!db) {
        throw new Error('Firestore is not initialized');
      }

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      let user: User;
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, 'id'>;
        user = {
          id: firebaseUser.uid,
          ...userData,
        };
      } else {
        // User document doesn't exist, create one with default values
        console.log('User document not found during login, creating default document for:', firebaseUser.email);
        user = await createDefaultUserDocument(firebaseUser);
      }
      
      setAuthState({
        isAuthenticated: true,
        user,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An error occurred during login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (error.message) {
        errorMessage = error.message;
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
    if (!auth || !db) {
      throw new Error('Firebase services are not initialized. Please check your configuration.');
    }

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
      } else if (error.message) {
        errorMessage = error.message;
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
    if (!auth) {
      console.error('Firebase Auth is not initialized');
      return;
    }

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