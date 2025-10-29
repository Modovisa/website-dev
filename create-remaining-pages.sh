#!/bin/bash

# LiveTracking Page
cat > src/pages/app/LiveTracking.jsx << 'EOF'
import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { secureFetch } from '../../lib/utils';

export default function LiveTracking() {
  const [visitors, setVisitors] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    loadLiveVisitors();
    
    // Set up WebSocket or polling for real-time updates
    const interval = setInterval(loadLiveVisitors, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadLiveVisitors() {
    try {
      const response = await secureFetch('/api/tracking/live');
      const data = await response.json();
      setVisitors(data.visitors || []);
    } catch (error) {
      console.error('Failed to load visitors:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Live Visitor Tracking</h1>
          <p className="text-muted-foreground">Real-time visitor activity on your website</p>
        </div>

        {/* Live Map */}
        <Card className="p-6 mb-6">
          <div id="live-map" ref={mapRef} className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Map will render here with actual data</p>
          </div>
        </Card>

        {/* Active Visitors */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Active Visitors</h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {visitors.length} online
            </span>
          </div>

          <div className="space-y-4">
            {visitors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active visitors at the moment</p>
            ) : (
              visitors.map((visitor, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-border pb-4 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                      <p className="font-medium">{visitor.location || 'Unknown Location'}</p>
                      <p className="text-sm text-muted-foreground">{visitor.currentPage || '/'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{visitor.duration || '0s'}</p>
                    <p className="text-xs text-muted-foreground">{visitor.pageViews || 1} pages</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
EOF

# Register Page
cat > src/pages/auth/Register.jsx << 'EOF'
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { secureFetch } from '../../lib/utils';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    try {
      const response = await secureFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });
      
      if (response.ok) {
        navigate('/login');
      } else {
        const data = await response.json();
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/img/branding/logo.svg" alt="Modovisa" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground mt-2">Get started with Modovisa today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
EOF

# Reset Password
cat > src/pages/auth/ResetPassword.jsx << 'EOF'
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { secureFetch } from '../../lib/utils';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      await secureFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setSent(true);
    } catch (error) {
      console.error('Reset failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/img/branding/logo.svg" alt="Modovisa" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground mt-2">
            {sent ? 'Check your email' : 'Enter your email to reset your password'}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">
              We've sent you an email with instructions to reset your password.
            </div>
            <Link to="/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Link to="/login" className="block text-center text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </form>
        )}
      </Card>
    </div>
  );
}
EOF

# Create placeholder pages for other routes
for page in TrackingSetup Installation UserProfile; do
cat > src/pages/app/${page}.jsx << EOF
import React from 'react';
import { Header } from '../../components/layout/Header';

export default function ${page}() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold">${page}</h1>
        <p className="text-muted-foreground mt-2">Content will be migrated here</p>
      </main>
    </div>
  );
}
EOF
done

# Create MV Admin placeholder pages
for page in Login Dashboard Users UserProfile Sites Billing Settings Logs Permissions; do
mkdir -p src/pages/mv-admin
cat > src/pages/mv-admin/${page}.jsx << EOF
import React from 'react';
import { Header } from '../../components/layout/Header';

export default function MV${page}() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold">Admin - ${page}</h1>
        <p className="text-muted-foreground mt-2">Admin content will be migrated here</p>
      </main>
    </div>
  );
}
EOF
done

# Create Docs placeholder pages
for page in Index Install Register SetupTracking; do
mkdir -p src/pages/docs
cat > src/pages/docs/${page}.jsx << EOF
import React from 'react';
import { Header } from '../../components/layout/Header';

export default function Docs${page}() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold">Documentation - ${page}</h1>
        <p className="text-muted-foreground mt-2">Documentation content will be migrated here</p>
      </main>
    </div>
  );
}
EOF
done

echo "All pages created!"
