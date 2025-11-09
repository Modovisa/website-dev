// src/pages/Index.tsx

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight, Eye, BarChart2, Zap, Shield, Globe, Clock, Package, Briefcase, Check } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { AnimatedGradient } from "@/components/AnimatedGradient";
import { useState } from "react";

const Index = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [eventTier, setEventTier] = useState(0);
  
  // Pricing tiers based on events
  const pricingTiers = [
    { events: "25,000", monthlyPrice: 14, yearlyPrice: 11 },
    { events: "50,000", monthlyPrice: 24, yearlyPrice: 19 },
    { events: "100,000", monthlyPrice: 44, yearlyPrice: 35 },
    { events: "250,000", monthlyPrice: 99, yearlyPrice: 79 },
    { events: "500,000", monthlyPrice: 179, yearlyPrice: 143 },
  ];
  
  const currentTier = pricingTiers[eventTier];
  
  const features = [
    {
      icon: Eye,
      title: "Real-Time Tracking",
      description: "Watch visitors navigate your site in real-time with detailed session recordings.",
    },
    {
      icon: BarChart2,
      title: "Advanced Analytics",
      description: "Deep insights into user behavior, conversions, and funnel analysis.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Lightweight script that won't slow down your website performance.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "GDPR compliant with respect for user privacy and data protection.",
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description: "Track visitors from anywhere in the world with accurate geolocation.",
    },
    {
      icon: Clock,
      title: "Session Replay",
      description: "Replay user sessions to understand exactly how visitors interact.",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated gradient canvas background */}
        <AnimatedGradient />
        
        {/* Optional grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] pointer-events-none" />
        
        {/* Content container - positioned above the canvas */}
        <div className="container relative mx-auto px-4 py-20 z-10">
          <nav className="flex items-center justify-between mb-20">
            <Logo className="text-white" />
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-white text-primary hover:bg-white/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </nav>

          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Intuitive Analytics
              <br />
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                for Modern Teams
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
              Track visitors, analyze behavior, and grow your business with beautiful, actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link to="/register">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="hero" className="h-14 px-8 text-lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for teams who want to understand their users better.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tailored pricing plans designed for you
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start for free — upgrade as your needs grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Package className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-2">Free</h3>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    Up to <span className="font-semibold text-foreground">3,000 events</span> per month
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              <Link to="/register" className="block">
                <Button variant="outline" className="w-full h-12 text-base" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card hover:shadow-xl transition-all duration-300 relative">
              <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-6">Pro</h3>
                
                {/* Monthly/Yearly Toggle */}
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-sm ${!isYearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    Monthly
                  </span>
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                  />
                  <span className={`text-sm ${isYearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    Yearly
                  </span>
                  {isYearly && (
                    <Badge variant="secondary" className="text-xs">
                      Save 20%
                    </Badge>
                  )}
                </div>

                {/* Monthly/Yearly Toggle */}
                <div className="flex items-center gap-3 mb-6">
                  <span className={`text-sm ${!isYearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    Monthly
                  </span>
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                  />
                  <span className={`text-sm ${isYearly ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                    Yearly
                  </span>
                  {isYearly && (
                    <Badge variant="secondary" className="text-xs">
                      Save 20%
                    </Badge>
                  )}
                </div>

                {/* Price Slider */}
                <div className="mb-8 w-full">
                  <div className="relative mb-4">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <div className="bg-foreground text-background px-3 py-1 rounded text-xs font-medium whitespace-nowrap">
                        {currentTier.events} events
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 bg-background">
                    <Slider
                      value={[eventTier]}
                      onValueChange={(value) => setEventTier(value[0])}
                      max={pricingTiers.length - 1}
                      step={1}
                      className="w-full mb-4"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {currentTier.events} <span className="font-medium">events / mo</span>
                      </span>
                      <span className="text-lg font-bold">
                        ${isYearly ? currentTier.yearlyPrice : currentTier.monthlyPrice} <span className="text-sm text-muted-foreground font-normal">/ mo</span>
                      </span>
                    </div>
                  </div>
                  
                  {isYearly && (
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Billed annually
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              <Link to="/register" className="block">
                <Button className="w-full h-12 text-base" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        {/* Animated gradient canvas background */}
        <AnimatedGradient />
        
        {/* Optional grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] pointer-events-none" />
        
        {/* Content - positioned above the canvas */}
        <div className="container relative mx-auto px-4 text-center z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using Modovisa to understand their users better.
          </p>
          <Link to="/register">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-lg">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-3">FAQ</Badge>
            <h2 id="faq-heading" className="text-4xl md:text-5xl font-bold mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground text-lg">Answers to commonly asked questions</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem value="item-1" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">What is considered an “event”?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  An event is any tracked action taken by a visitor on your website—such as a page view, button click, form submission, or cart activity. You can define custom events to capture the interactions that matter most to your business.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">How is this different from Google Analytics?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Modovisa focuses on clarity and actionability with privacy-first insights, beautiful visualizations, and session replay—without the complexity of traditional analytics tools.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">Do I need to install any code to get started?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Yes, you’ll add a lightweight script to your site. It’s optimized for performance and won’t slow down your pages.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">Is there a free plan available?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Absolutely. Our free plan includes generous limits so you can explore the product and get value before upgrading.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">Will using this tool affect my website's load time?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  No—our script is tiny, loads asynchronously, and is designed to have negligible impact on performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6" className="rounded-2xl border bg-card px-6">
                <AccordionTrigger className="py-5 text-left">Can I track custom events like form submissions or product clicks?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Yes, you can define and track custom events to measure the interactions that matter most to your business.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
};

export default Index;