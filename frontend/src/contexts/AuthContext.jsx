/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    signInWithCustomToken,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const AuthContext = createContext({
    currentUser: null,
    userRole: null,
    isAdmin: false,
    isSuperAdmin: false,
    loading: true
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        console.error("useAuth must be used within an AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userPlan, setUserPlan] = useState('Free');
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const superAdminEmail = 'admin@printguard.ai';

    const fetchUserProfile = async (uid) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/user/${uid}/profile`);
            if (response.ok) {
                const data = await response.json();
                if (data && !data.error) {
                    return data;
                }
            }
        } catch (err) {
            console.error("fetchUserProfile error:", err);
        }
        return null;
    };

    const ensureUserInDB = async (user, providerInfo = null) => {
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const existingUser = await fetchUserProfile(user.uid);

            if (!existingUser) {
                const autoProvider = user.providerData?.[0]?.providerId === 'google.com' ? 'Google' :
                    (user.providerData?.[0]?.providerId === 'phone' ? 'Phone' : 'Email');
                const finalProvider = providerInfo || autoProvider;

                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30);

                const initPayload = {
                    email: user.email,
                    display_name: user.displayName || user.email?.split('@')[0] || 'User',
                    provider: finalProvider,
                    plan: 'Free',
                    subscription_end_date: expiry.toISOString()
                };

                await fetch(`${apiBase}/api/user/${user.uid}/profile`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(initPayload)
                });
                setUserRole('User');
                setUserPlan('Free');
                setUserProfile(initPayload);
            } else {
                setUserRole(existingUser.role || 'User');
                setUserPlan(existingUser.plan || 'Free');
                setUserProfile(existingUser);
            }
        } catch (error) {
            console.error("ensureUserInDB failed:", error);
        }
    };

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        if (result?.user) await ensureUserInDB(result.user, 'Google');
        return result;
    };

    const loginWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result?.user) await ensureUserInDB(result.user, 'Email');
        return result;
    };

    const loginWithCustomToken = async (token) => {
        const result = await signInWithCustomToken(auth, token);
        if (result?.user) await ensureUserInDB(result.user, 'Phone');
        return result;
    };

    const logout = () => {
        setUserProfile(null);
        return signOut(auth);
    };

    const updatePlan = async (newPlan, isTrial = false) => {
        if (!currentUser) return false;
        try {
            const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const expiry = new Date();
            const days = newPlan === 'Enterprise' ? 365 : (isTrial ? 7 : 30);
            expiry.setDate(expiry.getDate() + days);

            const payload = { 
                plan: newPlan,
                subscription_end_date: expiry.toISOString()
            };

            if (isTrial) {
                payload.trial_expires_at = expiry.toISOString();
                payload.has_used_trial = true;
            }

            // Update via backend API for consistency (Supabase + Firestore)
            const response = await fetch(`${apiBase}/api/user/${currentUser.uid}/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to update plan on server");

            setUserPlan(newPlan);
            setUserProfile(prev => ({ ...(prev || {}), ...payload }));
            return true;
        } catch (error) {
            console.error("updatePlan failed:", error);
            toast.error("Upgrade failed. Please contact support.");
            return false;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const profile = await fetchUserProfile(user.uid);
                    if (profile) {
                        setUserRole(profile.role || 'User');
                        setUserPlan(profile.plan || 'Free');
                        setUserProfile(profile);
                    } else {
                        await ensureUserInDB(user);
                    }
                } catch (err) {
                    console.error("Auth profile sync error:", err);
                    setUserRole('User');
                    setUserPlan('Free');
                }
            } else {
                setUserRole(null);
                setUserPlan('Free');
                setUserProfile(null);
            }
            setCurrentUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const userEmail = currentUser?.email?.toLowerCase() || '';
    const isSuper = userEmail === superAdminEmail;

    const value = {
        currentUser,
        userRole,
        userPlan,
        userProfile,
        isAdmin: userRole === 'Admin' || isSuper,
        isSuperAdmin: isSuper,
        loading,
        loginWithGoogle,
        loginWithEmail,
        loginWithCustomToken,
        logout,
        updatePlan,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
