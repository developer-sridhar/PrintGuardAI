import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const ensureUserInDB = async (user) => {
        try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                    photoURL: user.photoURL || null,
                    role: 'User',
                    plan: 'Free',
                    status: 'Active',
                    joined: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error ensuring user in DB:", error);
        }
    };

    // Google Login
    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        if (result?.user) {
            await ensureUserInDB(result.user);
        }
        return result;
    };

    // Admin Email/Password Login
    const loginWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result?.user) {
            await ensureUserInDB(result.user);
        }
        return result;
    };
    const logout = () => {
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loginWithGoogle,
        loginWithEmail,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
