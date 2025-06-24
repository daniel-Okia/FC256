import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

/**
 * Creates an admin user in the Firestore users collection
 * This should be run once to set up the initial admin account
 */
export const createAdminUser = async (): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }

  try {
    const adminUser: Omit<User, 'id'> = {
      name: 'Administrator',
      email: 'admin@fc256.com',
      role: 'admin',
      phone: '+256 700 000 000',
      dateJoined: new Date().toISOString(),
      avatarUrl: '',
    };

    // Create the admin user document with a specific ID
    const adminUserId = 'admin-user-fc256';
    await setDoc(doc(db, 'users', adminUserId), adminUser);

    console.log('Admin user created successfully!');
    console.log('Admin credentials:');
    console.log('Email: admin@fc256.com');
    console.log('You can now create a password for this account using Firebase Auth');
    
    return;
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

/**
 * Alternative admin user data - you can modify this as needed
 */
export const createCustomAdminUser = async (adminData: {
  name: string;
  email: string;
  phone?: string;
}): Promise<void> => {
  if (!db) {
    throw new Error('Firestore is not initialized. Please check your Firebase configuration.');
  }

  try {
    const adminUser: Omit<User, 'id'> = {
      name: adminData.name,
      email: adminData.email,
      role: 'admin',
      phone: adminData.phone || '',
      dateJoined: new Date().toISOString(),
      avatarUrl: '',
    };

    // Create a unique ID based on email
    const adminUserId = `admin-${adminData.email.replace(/[^a-zA-Z0-9]/g, '-')}`;
    await setDoc(doc(db, 'users', adminUserId), adminUser);

    console.log('Custom admin user created successfully!');
    console.log('Admin credentials:');
    console.log(`Email: ${adminData.email}`);
    console.log('You can now create a password for this account using Firebase Auth');
    
    return;
  } catch (error) {
    console.error('Error creating custom admin user:', error);
    throw error;
  }
};