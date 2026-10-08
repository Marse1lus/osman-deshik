import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Осман Дешик — личный кабинет",
  description: "Личный кабинет и голосование. Сайт принадлежит Virginia group.",
  robots: { index: false, follow: false },
  icons: { icon: "/logo.png?v=hell", apple: "/logo.png?v=hell" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
