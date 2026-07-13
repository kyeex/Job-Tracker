import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jobfolio — Personal Job Tracker",
  description: "A private, local-first workspace for managing job applications.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
