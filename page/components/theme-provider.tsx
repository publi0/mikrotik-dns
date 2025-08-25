"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

interface CustomThemeProviderProps
  extends Omit<
    ThemeProviderProps,
    "attribute" | "defaultTheme" | "enableSystem" | "storageKey"
  > {
  /** Custom storage key for localStorage (optional) */
  storageKey?: string;
  /** Custom default theme (optional) */
  defaultTheme?: "light" | "dark" | "system";
}

export function ThemeProvider({
  children,
  storageKey = "mikrotik-dns-theme",
  defaultTheme = "light",
  ...props
}: CustomThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      storageKey={storageKey}
      disableTransitionOnChange={false}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
