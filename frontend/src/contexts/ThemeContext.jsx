import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() =>
        localStorage.getItem('printguard_theme') || 'dark'
    );
    const [color, setColor] = useState(() =>
        localStorage.getItem('printguard_color') || 'yellow'
    );

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        root.setAttribute('data-color', color);
        localStorage.setItem('printguard_theme', theme);
        localStorage.setItem('printguard_color', color);
    }, [theme, color]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, color, setColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
