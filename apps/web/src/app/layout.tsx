import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../lib/react-query";
import { AuthGuard } from "../lib/auth-guard";
import { LoadingProvider } from "../lib/loading-context";
import { LoadingOverlay } from "../components/loading/LoadingOverlay";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clarifaior - No-Code AI Agent Platform",
  description:
    "Build, deploy, and manage AI agents with drag-and-drop simplicity",
  keywords: "AI, automation, no-code, agents, workflow",
  authors: [{ name: "Clarifaior Team" }],
  viewport: "width=device-width, initial-scale=1",
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
        <LoadingProvider>
          <QueryProvider>
            <AuthGuard requireAuth={false}>{children}</AuthGuard>
            <LoadingOverlay />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "rgba(17, 24, 39, 0.95)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                },
                success: {
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#fff",
                  },
                },
                error: {
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#fff",
                  },
                },
              }}
            />
          </QueryProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
