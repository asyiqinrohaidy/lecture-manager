// src/utils/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyACS532I9nBGHPKdH6qNVSoLyQQ8Y7hZI8",
    authDomain: "lecturemanagementapp.firebaseapp.com",
    projectId: "lecturemanagementapp",
    storageBucket: "lecturemanagementapp.firebasestorage.app",
    messagingSenderId: "903941595438",
    appId: "1:903941595438:web:c785ae529b316af1fddabf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Authentication instance
const auth = getAuth(app);

export { auth };
