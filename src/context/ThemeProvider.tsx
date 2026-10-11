"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";
const THEME_PREFERENCE_KEY = "fastbreak-theme-preference";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const hasManualTheme = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    hasManualTheme.current = savedTheme === "light" || savedTheme === "dark";

    function applyTheme(nextTheme: Theme) {
      setTheme(nextTheme);
      root.classList.toggle("dark", nextTheme === "dark");
      root.classList.toggle("light", nextTheme === "light");
    }

    applyTheme(
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : colorScheme.matches
          ? "dark"
          : "light",
    );

    function handleSystemThemeChange(event: MediaQueryListEvent) {
      if (!hasManualTheme.current) applyTheme(event.matches ? "dark" : "light");
    }

    colorScheme.addEventListener("change", handleSystemThemeChange);
    return () => colorScheme.removeEventListener("change", handleSystemThemeChange);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    hasManualTheme.current = true;
    window.localStorage.setItem(THEME_PREFERENCE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.classList.toggle("light", nextTheme === "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}