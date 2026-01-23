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
      "Private experiences designed for real connections to feel like matchmaking in reality.",
    url: "https://www.realitymatchmaking.com",
    siteName: "Reality Matchmaking",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Reality Matchmaking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reality Matchmaking",
    description:
      "Private experiences designed for real connections to feel like matchmaking in reality.",
    images: ["/logo.png"],
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
    "@type": "Service",
    name: "Reality Matchmaking",
    description:
      "Private experiences designed for real connections to feel like matchmaking in reality.",
    url: "https://www.realitymatchmaking.com",
    serviceType: "Matchmaking Service",
    provider: {
      "@type": "Organization",
      name: "Reality Matchmaking",
      url: "https://www.realitymatchmaking.com",
      logo: {
        "@type": "ImageObject",
        url: "https://www.realitymatchmaking.com/logo.png",
      },
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
    category: "Dating & Relationships",
    image: "https://www.realitymatchmaking.com/logo.png",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="min-h-screen bg-white text-navy">{children}</div>
      </body>
    </html>
  );
}
