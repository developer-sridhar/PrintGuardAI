import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const ensureUserInDB = async (user) => {
        try {
            // Check if user exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('uid')
                .eq('uid', user.uid)
                .single();

            // If we hit a PGRST116 error it means 0 rows returned (user doesn't exist yet)
            if (checkError && checkError.code !== 'PGRST116') {
                console.error("Error checking Supabase user:", checkError);
                return;
            }

            // Insert new user if they don't exist
            if (!existingUser) {
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([{
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                        photo_url: user.photoURL || null,
                        role: 'User',
                        plan: 'Free',
                        status: 'Active'
                    }]);
                    
                if (insertError) {
                    console.error("Error inserting user to Supabase:", insertError);
                }
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
