import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { FloatingChat } from "@/components/floating-chat";
import { CartProvider } from "@/components/cart-store";
import { CartDrawer } from "@/components/cart-drawer";
import { getSiteSettings } from "@/lib/settings";

// AUDIT §6.2 — load only the fonts we actually use, with display: swap
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const inter = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://riva.spa"),
    title: {
      default: s.metaTitle,
      template: `%s · ${s.name}`,
    },
    description: s.metaDescription,
    keywords: ["спа", "массаж", "бассейн", "хаммам", s.city],
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: s.name,
      title: s.metaTitle,
      description: s.metaDescription,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf6f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  // Hide the public Nav/Footer on admin and master cabinet routes —
  // those have their own sidebar layouts. Middleware sets x-pathname.
  const path = headers().get("x-pathname") ?? "";
  const isInternal =
    path.startsWith("/admin") || path.startsWith("/master");

  return (
    <html
      lang="ru"
      className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body>
        <CartProvider>
          {isInternal ? (
            <>{children}</>
          ) : (
            <>
              <Nav settings={settings} />
              <main id="main">{children}</main>
              <Footer settings={settings} />
              <FloatingChat />
              <CartDrawer />
            </>
          )}
        </CartProvider>
      </body>
    </html>
  );
}
