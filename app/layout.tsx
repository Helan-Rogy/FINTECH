import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinTech Platform — Fraud & Risk Intelligence",
  description:
    "AI-powered fraud detection and credit risk scoring platform with transparent, explainable decisions.",
};

export const viewport: Viewport = {
  themeColor: "#0f1117",
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
