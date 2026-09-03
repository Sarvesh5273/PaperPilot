import type { Metadata } from 'next';
import './globals.css';
import { WebMCPProvider } from '@/components/WebMCPProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'PaperPilot — Agent-Native Research Workspace',
  description: 'Collaborative academic research and writing powered by WebMCP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('paperpilot_theme');
                if (theme === 'espresso') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-background text-foreground font-sans selection:bg-amber-500/20 selection:text-amber-900 dark:selection:text-amber-200">
        <ThemeProvider>
          <WebMCPProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
