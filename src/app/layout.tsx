import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { POSTER_FONTS_HREF } from "@/lib/editor/fonts";
import "./globals.css";

/** Interface text. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Headings and the wordmark. */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bubble UX — Facebook post creator",
  description:
    "Turn a photo into a Facebook post: filters, adjustments, crop, text, and export to JPG or PNG. Runs entirely in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Typefaces offered for post text. Loaded as plain families so the canvas can draw with them. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={POSTER_FONTS_HREF} />
      </head>
      <body className="flex h-full flex-col overflow-hidden">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
