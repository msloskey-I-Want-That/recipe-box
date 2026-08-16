import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ---------------------------------------------------------------
// Fill these in from your Firebase project settings:
// console.firebase.google.com -> your project -> Project settings
// -> General -> "Your apps" -> Web app -> SDK setup and config
// ---------------------------------------------------------------
const firebaseConfig = {
  apiKey: 'AIzaSyAiLPE-Z49QRy1Yj4gM-Yc-_wy5jnPd8Fs',
  authDomain: 'recipes-a7558.firebaseapp.com',
  projectId: 'recipes-a7558',
  storageBucket: 'recipes-a7558.firebasestorage.app',
  messagingSenderId: '522798336950',
  appId: '1:522798336950:web:2bf7e8cf3cd1206fd4cf17'
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
