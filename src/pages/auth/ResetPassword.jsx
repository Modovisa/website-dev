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
