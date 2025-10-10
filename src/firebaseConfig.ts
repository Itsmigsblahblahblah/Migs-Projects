import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBK_wV_1xpZ34smckAmKypJicYSAi6jpv4",
  authDomain: "farm-mangement-b35c2.firebaseapp.com",
  projectId: "farm-mangement-b35c2",
  storageBucket: "farm-mangement-b35c2.firebasestorage.app",
  messagingSenderId: "271863520723",
  appId: "1:271863520723:web:1138a00fc5b49768cb2326",
  measurementId: "G-8JHZGHJML3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);