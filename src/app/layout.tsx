import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { THEME_SCRIPT } from "@/lib/theme-script";
import "./poster-fonts";
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
  title: "Bubble Studio — Facebook post and reel creator",
  description:
    "Turn a photo or video into a Facebook post or reel: filters, crop, text, stickers, and export to JPG, PNG or MP4. Runs entirely in your browser.",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png", sizes: "512x512" }],
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved light/dark choice before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex h-full flex-col overflow-hidden">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
