import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AI Council — Multi-LLM Research Dashboard",
  description:
    "Ask one question, receive answers from multiple AI models simultaneously. Compare GPT-4, Gemini, Claude, and more side-by-side.",
  keywords: ["AI", "LLM", "ChatGPT", "Gemini", "Claude", "research", "comparison"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={`${inter.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
