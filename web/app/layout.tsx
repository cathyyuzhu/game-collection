import "./globals.css";
import type { Metadata } from "next";

// Root layout intentionally minimal - locale logic lives in middleware + [locale]/layout
export const metadata: Metadata = {};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
