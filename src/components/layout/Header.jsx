import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/img/branding/logo.svg" alt="Modovisa" className="h-8" />
        </Link>
        
        <nav className="flex items-center space-x-6">
          {user ? (
            <>
              <Link to="/app/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link to="/app/live-tracking" className="text-sm font-medium hover:text-primary transition-colors">
                Live Tracking
              </Link>
              <Link to="/app/user-profile" className="text-sm font-medium hover:text-primary transition-colors">
                Profile
              </Link>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/docs" className="text-sm font-medium hover:text-primary transition-colors">
                Docs
              </Link>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
