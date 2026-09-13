import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { HelpWidget } from "@/components/HelpWidget";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Display face for headlines — the advisory-firm serif look. */
const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cornerman — AI Sales Coach",
  description:
    "Diagnose where you lose deals, then drill that weak spot in a live spoken roleplay. Rep-owned coaching for residential real estate agents.",
};

const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('cornerman-theme');
    // First visit defaults to day (light); only honor an explicit saved choice.
    var theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
    var root = document.documentElement;
    root.classList.remove('light','dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`light ${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* This runs before React and its contents are irrelevant to hydration,
            so mismatches on it are never meaningful. Some antivirus products
            (Kaspersky's web protection, for one) rewrite script tags in <head>
            before React loads, which otherwise surfaces as a hydration error
            that looks like an app bug but is entirely client-side. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          {children}
          <HelpWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
