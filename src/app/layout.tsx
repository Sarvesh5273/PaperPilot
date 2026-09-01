import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PaperPilot — Agent-Native Research Workspace',
  description: 'Collaborative academic research and writing powered by WebMCP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
