import type { Metadata } from 'next';
import { DM_Sans, DM_Mono, Instrument_Serif, JetBrains_Mono } from 'next/font/google';

import '../styles/globals.css';
import { ThemeProvider } from '@/lib/theme';
import { Navbar } from '@/components/Navbar';
import { FloatingMenu } from '@/components/FloatingMenu';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from '@/components/ui/toaster';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-clock',
  display: 'swap',
});


const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});


export const metadata: Metadata = {
  title: 'FAST Isb Utilities',
  description: 'Find your weekly and exam schedules — FAST NUCES, Islamabad',
  icons: {
    icon: '/logo/icon.png',
    shortcut: '/logo/icon.png',
    apple: '/logo/icon.png',
  },
  openGraph: {
    title: 'FAST Isb Utilities',
    description: 'Find your weekly and exam schedules instantly',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#FAFAF8',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >





      <body className="bg-[var(--color-bg)] text-[var(--color-text-primary)] font-body antialiased">
        <ThemeProvider>
          {children}
          <Navbar />
          <FloatingMenu />
          <FeedbackWidget />
          <GlobalShortcuts />
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
