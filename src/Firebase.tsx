// Import the functions you need from the SDKs you need

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use

// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration

const firebaseConfig = {

  apiKey: "AIzaSyCTEwiFQr6lFg0HT00VX-Kvr6ITwXtKow0",

  authDomain: "fir-react-todolist-9f8e4.firebaseapp.com",

  projectId: "fir-react-todolist-9f8e4",

  storageBucket: "fir-react-todolist-9f8e4.appspot.com",

  messagingSenderId: "514938186676",

  appId: "1:514938186676:web:6cfe16fdc60cddcb7160e1"

};


// Initialize Firebase

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);