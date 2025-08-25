"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  DarkModeSwitch,
  DarkModeSwitchWithText,
  CompactDarkModeSwitch,
} from "@/components/dark-mode-switch";
import { Activity, Wifi } from "lucide-react";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  switchType?: "dropdown" | "simple" | "compact" | "withText";
}

export function DashboardHeader({
  title = "MikroTik DNS Analytics",
  subtitle = "Real-time DNS query analytics and monitoring dashboard",
  switchType = "dropdown",
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Wifi className="h-6 w-6 text-primary" />
              <Activity className="absolute -right-1 -top-1 h-3 w-3 text-green-500 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live</span>
          </div>
          {switchType === "dropdown" && <ThemeToggle />}
          {switchType === "simple" && <DarkModeSwitch />}
          {switchType === "compact" && <CompactDarkModeSwitch />}
          {switchType === "withText" && <DarkModeSwitchWithText />}
        </div>
      </div>
    </header>
  );
}

export function SimpleDashboardHeader({
  title = "MikroTik DNS Analytics",
}: Pick<DashboardHeaderProps, "title">) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Wifi className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-card-foreground">
            {title}
          </h1>
        </div>
      </div>
      <DarkModeSwitch showText />
    </div>
  );
}

// Versão apenas com botão simples de switch
export function MinimalDashboardHeader({
  title = "MikroTik DNS Analytics",
}: Pick<DashboardHeaderProps, "title">) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <CompactDarkModeSwitch />
    </div>
  );
}
