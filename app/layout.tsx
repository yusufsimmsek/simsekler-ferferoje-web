import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArchiFlow",
  description:
    "Kentsel dönüşüm projelerinde parsel, imar, CAD, metraj, inceleme ve teklif akışını tek çalışma alanında yönetin."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
