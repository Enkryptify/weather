import type { Metadata } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { getAppName } from "./lib/config";
import "./globals.css";

// Bodoni Moda — a true Didone for the dramatic, high-contrast numerals.
const bodoni = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Hanken Grotesk — a quiet, precise grotesque for labels and UI text.
const hanken = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Read APP_NAME at request time so the browser tab title reflects the value
// set on the latest deploy, no rebuild required.
export async function generateMetadata(): Promise<Metadata> {
  const name = await getAppName();
  return {
    title: `${name} — Weather`,
    description: `A quiet, premium forecast from ${name}.`,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodoni.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
