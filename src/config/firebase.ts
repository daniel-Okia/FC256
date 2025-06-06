import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyANfTIpkk7g5LjwPXC9CLDm3SSLVD8WUAY",
  authDomain: "fitholics-2f508.firebaseapp.com",
  projectId: "fitholics-2f508",
  storageBucket: "fitholics-2f508.firebasestorage.app",
  messagingSenderId: "205563792625",
  appId: "1:205563792625:web:7084095bf95a0a8cb96d50",
  measurementId: "G-5ZN4XKGQFN"
};

// Validate required config fields
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  throw new Error(`Missing required Firebase configuration fields: ${missingFields.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure auth is ready before exporting
auth.useDeviceLanguage();

export default app;