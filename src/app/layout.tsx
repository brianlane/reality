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
  description:
    "Private experiences designed for real connections to feel like matchmaking in reality.",
  metadataBase: new URL("https://www.realitymatchmaking.com"),
  openGraph: {
    title: "Reality Matchmaking",
    description:
      "",
    url: "https://www.realitymatchmaking.com",
    siteName: "Reality Matchmaking",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reality Matchmaking",
    description:
      "Private experiences designed for real connections to feel like matchmaking in reality.",
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "Reality Matchmaking",
    description:
      "Private experiences designed for real connections to feel like matchmaking in reality.",
    url: "https://www.realitymatchmaking.com",
    serviceType: "Matchmaking Service",
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    additionalType: "https://schema.org/Service",
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.realitymatchmaking.com/apply",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-white text-navy">{children}</div>
      </body>
    </html>
  );
}
