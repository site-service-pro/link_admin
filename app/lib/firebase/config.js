import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAd9OFEMI0-bdXGTD1vjHUJcU-3XfW0Oq8",
  authDomain: "link-140f5.firebaseapp.com",
  projectId: "link-140f5",
  storageBucket: "link-140f5.firebasestorage.app",
  messagingSenderId: "918390837809",
  appId: "1:918390837809:web:6e294f582e68a63fd33b10",
  measurementId: "G-ZWTF3398JZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, analytics };
