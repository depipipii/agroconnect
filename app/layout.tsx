import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgroConnect - IoT Soil Monitor",
  description: "AgroConnect: Modern IoT Dashboard for ESP32 Soil Moisture Sensor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
