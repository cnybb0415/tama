import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EXO Tamagotchi",
  description: "Raise your EXO member",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/picture/icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "EXO Tama",
    statusBarStyle: "black-translucent",
  },
  // robots.txt를 무시하는 봇도 있어서, 페이지 레벨에서도 한 번 더 색인/크롤링 금지 신호를 줌
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 홈 화면에 추가(standalone)한 iOS 앱에서 viewport-fit이 없으면 노치 영역을
  // 피해 안전한 사각형 안에만 렌더링하려다가 화면 전체가 작게 줄어드는 문제가 있었음
  viewportFit: 'cover',
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
