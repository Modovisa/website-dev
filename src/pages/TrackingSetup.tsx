// src/pages/TrackingSetup.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TrackingSetup = () => {
  return (
    <AnimatedGradientBackground layout="full">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex flex-col items-center space-y-2 py-4">
              <Link to="/">
                <Logo showBeta={false} />
              </Link>
              <p class="text-lg  font-semibold mb-0">Intuitive Analytics.</p>
              <h1 className="text-2xl font-semibold mt-6">Sign in to your account</h1>
            </div>
            <h1 className="text-2xl font-semibold mt-6">Track your website</h1>
            <p className="text-center text-muted-foreground text-sm">
              Provide some details about the website you'd like to track.<br />
              We'll use this to generate your personalized tracking script.
            </p>
          </div>

          <form className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="website-name">Website Name</Label>
              <Input
                id="website-name"
                type="text"
                placeholder="Enter your website name"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <div className="flex gap-2">
                <div className="bg-muted rounded-lg px-4 flex items-center text-sm text-muted-foreground border">
                  https://
                </div>
                <Input
                  id="domain"
                  type="text"
                  placeholder="mywebsite.com"
                  className="h-12 flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">Do not include "https://"</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Website Category</Label>
              <Select>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="asia-calcutta">
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia-calcutta">(GMT+05:30) Asia/Calcutta</SelectItem>
                  <SelectItem value="america-new-york">(GMT-05:00) America/New York</SelectItem>
                  <SelectItem value="europe-london">(GMT+00:00) Europe/London</SelectItem>
                  <SelectItem value="asia-tokyo">(GMT+09:00) Asia/Tokyo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Date ranges, time ranges, and visitor activity times will follow this timezone. You can change it later if needed.
              </p>
            </div>

            <Button className="w-full h-12 text-base" size="lg">
              Setup Tracking
            </Button>

            <Link to="/">
              <Button variant="ghost" className="w-full" type="button">
                Set up later
              </Button>
            </Link>
          </form>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
};

export default TrackingSetup;
