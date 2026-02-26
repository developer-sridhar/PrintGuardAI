import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBWiO4Hm747teERpeDRO6fCZA0IHuCbUMc",
    authDomain: "printguard-ai-1b898.firebaseapp.com",
    projectId: "printguard-ai-1b898",
    storageBucket: "printguard-ai-1b898.firebasestorage.app",
    messagingSenderId: "579695235796",
    appId: "1:579695235796:web:b10066d7667cbd97a16141",
    measurementId: "G-KM600KLPVG"
};

const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Apply the custom OAuth 2.0 Web Client ID provided by the user
googleProvider.setCustomParameters({
    hint: 'login',
    client_id: '579695235796-3pclj8inp9upr29iol0830lvqma6lv92.apps.googleusercontent.com'
});

export const setupRecaptcha = (containerId) => {
    return new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
            // reCAPTCHA solved
        },
    });
};
