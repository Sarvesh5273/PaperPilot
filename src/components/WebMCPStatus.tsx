'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Sun, Moon, Compass } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export function WebMCPStatus() {
  const [hasWebMCP, setHasWebMCP] = useState<boolean>(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAvailable =
        !!(window as unknown as { modelContext?: unknown }).modelContext ||
        !!(typeof document !== 'undefined' && (document as unknown as { modelContext?: unknown }).modelContext);
      if (isAvailable) {
        setHasWebMCP(true);
      }
    }
  }, []);

  return (
    <header className="h-14 border-b border-border/70 bg-card/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/25">
          <Compass className="w-4 h-4 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="font-editorial text-lg font-bold tracking-tight text-foreground">
            Paper<span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">Pilot</span>
          </h1>
          <span className="hidden sm:inline-block text-[11px] font-medium text-muted-foreground/80 tracking-wide uppercase">
            Agent-Native Research Studio
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {hasWebMCP ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden md:inline">Agent Tools Ready</span>
            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">(WebMCP Active)</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-300 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="hidden lg:inline">WebMCP Inactive — Chrome 149+ flag or ChatGPT Browser</span>
            <span className="lg:hidden">WebMCP Inactive</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={toggleTheme}
          className="h-8 px-2.5 rounded-lg border-border/80 bg-background/80 hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-all gap-1.5"
          aria-label={theme === 'paper' ? 'Switch to Warm Espresso theme' : 'Switch to Warm Paper theme'}
          title={theme === 'paper' ? 'Switch to Warm Espresso theme' : 'Switch to Warm Paper theme'}
        >
          {theme === 'paper' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline text-[11px]">Espresso</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">Paper</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
