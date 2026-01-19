import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reality Matchmaking",
  description: "Private matchmaking experiences designed for real connections.",
  metadataBase: new URL("https://www.realitymatchmaking.com"),
  openGraph: {
    title: "Reality Matchmaking",
    description:
      "Private matchmaking experiences designed for real connections.",
    url: "https://www.realitymatchmaking.com",
    siteName: "Reality Matchmaking",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reality Matchmaking",
    description:
      "Private matchmaking experiences designed for real connections.",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-white text-navy">{children}</div>
      </body>
    </html>
  );
}
