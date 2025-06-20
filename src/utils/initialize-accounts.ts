import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { User } from '../types';

// Hardcoded account credentials
export const ADMIN_CREDENTIALS = {
  email: 'danielokia256@gmail.com',
  password: 'FC256Admin2024!@#',
  userData: {
    name: 'Daniel Okia',
    email: 'danielokia256@gmail.com',
    role: 'admin' as const,
    phone: '+256 700 123 456',
    dateJoined: new Date().toISOString(),
    avatarUrl: '',
  }
};

export const MANAGER_CREDENTIALS = {
  email: 'piuspaul392@gmail.com',
  password: 'FC256Manager2024$%^',
  userData: {
    name: 'Pius Paul',
    email: 'piuspaul392@gmail.com',
    role: 'manager' as const,
    phone: '+256 700 654 321',
    dateJoined: new Date().toISOString(),
    avatarUrl: '',
  }
};

/**
 * Creates both admin and manager accounts in Firebase Auth and Firestore
 */
export const initializeHardcodedAccounts = async (): Promise<{
  success: boolean;
  message: string;
  accounts: { email: string; password: string; role: string }[];
}> => {
  if (!auth || !db) {
    throw new Error('Firebase services are not initialized. Please check your configuration.');
  }

  const results = [];
  const accounts = [];

  try {
    // Create Admin Account
    try {
      // Check if admin user already exists in Firestore
      const adminDoc = await getDoc(doc(db, 'users', 'admin-daniel-okia'));
      
      if (!adminDoc.exists()) {
        // Create Firebase Auth account
        const adminUserCredential = await createUserWithEmailAndPassword(
          auth, 
          ADMIN_CREDENTIALS.email, 
          ADMIN_CREDENTIALS.password
        );

        // Create Firestore user document
        await setDoc(doc(db, 'users', adminUserCredential.user.uid), ADMIN_CREDENTIALS.userData);
        
        results.push(`✅ Admin account created successfully`);
        accounts.push({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
          role: 'Administrator'
        });
      } else {
        results.push(`ℹ️ Admin account already exists`);
        accounts.push({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
          role: 'Administrator (existing)'
        });
      }
    } catch (adminError: any) {
      if (adminError.code === 'auth/email-already-in-use') {
        results.push(`ℹ️ Admin email already registered in Firebase Auth`);
        accounts.push({
          email: ADMIN_CREDENTIALS.email,
          password: ADMIN_CREDENTIALS.password,
          role: 'Administrator (existing)'
        });
      } else {
        results.push(`❌ Admin account creation failed: ${adminError.message}`);
      }
    }

    // Create Manager Account
    try {
      // Check if manager user already exists in Firestore
      const managerDoc = await getDoc(doc(db, 'users', 'manager-pius-paul'));
      
      if (!managerDoc.exists()) {
        // Create Firebase Auth account
        const managerUserCredential = await createUserWithEmailAndPassword(
          auth, 
          MANAGER_CREDENTIALS.email, 
          MANAGER_CREDENTIALS.password
        );

        // Create Firestore user document
        await setDoc(doc(db, 'users', managerUserCredential.user.uid), MANAGER_CREDENTIALS.userData);
        
        results.push(`✅ Manager account created successfully`);
        accounts.push({
          email: MANAGER_CREDENTIALS.email,
          password: MANAGER_CREDENTIALS.password,
          role: 'Manager'
        });
      } else {
        results.push(`ℹ️ Manager account already exists`);
        accounts.push({
          email: MANAGER_CREDENTIALS.email,
          password: MANAGER_CREDENTIALS.password,
          role: 'Manager (existing)'
        });
      }
    } catch (managerError: any) {
      if (managerError.code === 'auth/email-already-in-use') {
        results.push(`ℹ️ Manager email already registered in Firebase Auth`);
        accounts.push({
          email: MANAGER_CREDENTIALS.email,
          password: MANAGER_CREDENTIALS.password,
          role: 'Manager (existing)'
        });
      } else {
        results.push(`❌ Manager account creation failed: ${managerError.message}`);
      }
    }

    return {
      success: true,
      message: results.join('\n'),
      accounts
    };

  } catch (error: any) {
    console.error('Error initializing accounts:', error);
    return {
      success: false,
      message: `Failed to initialize accounts: ${error.message}`,
      accounts
    };
  }
};

/**
 * Creates individual account (for manual creation)
 */
export const createIndividualAccount = async (
  credentials: typeof ADMIN_CREDENTIALS | typeof MANAGER_CREDENTIALS
): Promise<{ success: boolean; message: string }> => {
  if (!auth || !db) {
    throw new Error('Firebase services are not initialized.');
  }

  try {
    // Create Firebase Auth account
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      credentials.email, 
      credentials.password
    );

    // Create Firestore user document
    await setDoc(doc(db, 'users', userCredential.user.uid), credentials.userData);

    return {
      success: true,
      message: `Account created successfully for ${credentials.email}`
    };

  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return {
        success: true,
        message: `Account already exists for ${credentials.email}`
      };
    }
    
    return {
      success: false,
      message: `Failed to create account: ${error.message}`
    };
  }
};