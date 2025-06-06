import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyANfTIpkk7g5LjwPXC9CLDm3SSLVD8WUAY",
  authDomain: "fitholics-2f508.firebaseapp.com",
  projectId: "fitholics-2f508",
  storageBucket: "fitholics-2f508.firebasestorage.app",
  messagingSenderId: "205563792625",
  appId: "1:205563792625:web:7084095bf95a0a8cb96d50",
  measurementId: "G-5ZN4XKGQFN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;