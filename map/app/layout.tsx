import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { SettingsProvider } from "@/lib/SettingsContext";
import { WorkflowProvider } from "@/lib/WorkflowContext";
import SessionProvider from "@/components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voyage Process Transformation",
  description: "Visual process mapping for workflow analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <SettingsProvider>
            <WorkflowProvider>
              <AppShell>{children}</AppShell>
            </WorkflowProvider>
          </SettingsProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
