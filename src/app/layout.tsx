import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

  const rawPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const metaPixelId =
    rawPixelId && /^\d+$/.test(rawPixelId) ? rawPixelId : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}
        {metaPixelId && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript fallback requires a plain img beacon */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <div className="min-h-screen bg-white text-navy">{children}</div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
