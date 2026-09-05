import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "CallDesk";

export const metadata: Metadata = {
  title: `${brandName} — AI Voice Calling Platform`,
  description: `${brandName} is a voice AI calling platform — campaigns, calls, and billing in one place.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
