"use client";

import { Button } from "@repo/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { AIBrainIcon, RobotIcon, FlowIcon, TriggerIcon, AIPulseIcon } from "@repo/ui/icons";
import { ArrowRight, Zap, Brain, Network, Workflow } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white">
      {/* Navigation */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <AIPulseIcon size="lg" className="text-cyan-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Clarifaior
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Features
              </Button>
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Docs
              </Button>
              <Button variant="ai" size="sm">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <Badge variant="ai" className="mb-4">
              🚀 AI-Powered Automation Platform
            </Badge>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-blue-200 bg-clip-text text-transparent">
            Build AI Agents
            <br />
            <span className="text-cyan-400">Without Code</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Create powerful AI agents with drag-and-drop simplicity. Connect Gmail, Slack, Notion, and more. 
            Automate your workflows with the power of AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="ai" size="xl" className="group">
              Start Building
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 opacity-20">
          <AIBrainIcon size="xl" className="animate-pulse" />
        </div>
        <div className="absolute top-40 right-20 opacity-20">
          <RobotIcon size="xl" className="animate-bounce" />
        </div>
        <div className="absolute bottom-20 left-20 opacity-20">
          <FlowIcon size="xl" className="animate-pulse" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to build, deploy, and scale AI agents
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Visual Flow Builder</CardTitle>
                <CardDescription className="text-gray-300">
                  Drag and drop to create complex AI workflows without writing code
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4">
                  <Network className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Smart Integrations</CardTitle>
                <CardDescription className="text-gray-300">
                  Connect Gmail, Slack, Notion, and 50+ other services seamlessly
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Real-time Triggers</CardTitle>
                <CardDescription className="text-gray-300">
                  Instant responses to emails, messages, webhooks, and schedules
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center mb-4">
                  <AIBrainIcon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Advanced AI Models</CardTitle>
                <CardDescription className="text-gray-300">
                  Powered by DeepSeek, Gemini, and other cutting-edge LLMs
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <Workflow className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Memory & Context</CardTitle>
                <CardDescription className="text-gray-300">
                  Vector-powered memory for intelligent, context-aware responses
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mb-4">
                  <TriggerIcon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Enterprise Ready</CardTitle>
                <CardDescription className="text-gray-300">
                  Secure, scalable, and built for teams of any size
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            Ready to Build Your First AI Agent?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of developers and businesses automating their workflows with AI
          </p>
          <Button variant="ai" size="xl" className="group">
            Start Building Now
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AIPulseIcon className="text-cyan-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Clarifaior
            </span>
          </div>
          <p className="text-gray-400">
            © 2024 Clarifaior. Building the future of AI automation.
          </p>
        </div>
      </footer>
    </div>
  );
}
