/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    // Default to 'Free' plan. In a real app, you would fetch this from your backend/auth service
    const [userPlan, setUserPlan] = useState('Free'); // 'Free', 'Pro', 'Enterprise'

    // Example of persisting it locally for the demo so it survives refreshes
    useEffect(() => {
        const storedPlan = localStorage.getItem('printguard_user_plan');
        if (storedPlan && storedPlan !== userPlan) {
            setUserPlan(storedPlan);
        }
    }, [userPlan]);

    const upgradePlan = (newPlan) => {
        setUserPlan(newPlan);
        localStorage.setItem('printguard_user_plan', newPlan);
    };

    return (
        <UserContext.Provider value={{ userPlan, upgradePlan }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
