import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "State Infrastructure Asset Management System",
  description:
    "Internal system for registering and managing state government infrastructure assets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
