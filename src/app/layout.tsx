import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REVERXE",
  description: "REVERXE Tamagotchi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
