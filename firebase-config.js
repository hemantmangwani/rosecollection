// Firebase Configuration
// Rose Collection - Firebase Config

const firebaseConfig = {
  apiKey: "AIzaSyDjPt8QbC39m0vrwaM8dlZQ4rnk7DWotZU",
  authDomain: "rosecollection-5e1a4.firebaseapp.com",
  projectId: "rosecollection-5e1a4",
  storageBucket: "rosecollection-5e1a4.firebasestorage.app",
  messagingSenderId: "384081982640",
  appId: "1:384081982640:web:ae3bf3bb7796339766f775",
  measurementId: "G-9BYMQNJK1N"
};

// Initialize Firebase (this will be used by other scripts)
let db = null;
let auth = null;

try {
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  // Initialize Firestore
  db = firebase.firestore();

  // Initialize Auth
  auth = firebase.auth();

  console.log('✅ Firebase initialized successfully!');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  alert('Firebase configuration error. Please check firebase-config.js');
}
