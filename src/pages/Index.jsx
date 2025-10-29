import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Header />
      
      <main className="container py-20">
        <div className="text-center space-y-8 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-6xl font-bold tracking-tight">
            Real-Time Visitor Tracking
            <br />
            <span className="gradient-text">Made Simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Track visitors, page journeys, conversions, and engagement as they happen.
            Fast, privacy-friendly, and easy to use.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link to="/register">
              <Button className="h-12 px-8 text-base">
                Get Started Free
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" className="h-12 px-8 text-base">
                View Documentation
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'Real-Time Analytics', desc: 'See visitors as they browse your site in real-time' },
            { title: 'Privacy-Friendly', desc: 'GDPR compliant with no cookies required' },
            { title: 'Easy Integration', desc: 'One line of code to get started' }
          ].map((feature, i) => (
            <Card key={i} className="text-center p-8">
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
