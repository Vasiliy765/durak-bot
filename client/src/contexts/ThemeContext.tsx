import React, { createContext, useContext } from "react";
const ThemeContext = createContext({ theme: "dark", toggleTheme: () => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeContext.Provider value={{ theme: "dark", toggleTheme: () => {} }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
