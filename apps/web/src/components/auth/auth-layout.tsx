"use client";

import { AIPulseIcon } from "@repo/ui/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  showLogo?: boolean;
}

export function AuthLayout({ 
  children, 
  title, 
  description, 
  showLogo = true 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {showLogo && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <AIPulseIcon size="xl" className="text-cyan-400" />
              <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Clarifaior
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              AI-Powered Automation Platform
            </p>
          </div>
        )}

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              {title}
            </CardTitle>
            <CardDescription className="text-gray-300">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            © 2024 Clarifaior. Building the future of AI automation.
          </p>
        </div>
      </div>
    </div>
  );
}
