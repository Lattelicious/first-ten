import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "First Ten — Medical distribution, Mexico",
  description:
    "Find the right route to market. Evidence-backed tenders, physicians, and hospital opportunities for medical suppliers in Mexico.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
