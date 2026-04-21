import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCkcjRD6yIk8NnUVewNK--t-3tAXqdxZy8",
  authDomain: "groceriesapp-470fd.firebaseapp.com",
  databaseURL: "https://groceriesapp-470fd-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "groceriesapp-470fd",
  storageBucket: "groceriesapp-470fd.firebasestorage.app",
  messagingSenderId: "160405222605",
  appId: "1:160405222605:web:9fa19ed200d86428346584"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app, 'groceriesapp');
