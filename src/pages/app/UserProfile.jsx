import React from 'react';
import { Header } from '../../components/layout/Header';

export default function UserProfile() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <h1 className="text-3xl font-bold">UserProfile</h1>
        <p className="text-muted-foreground mt-2">Content will be migrated here</p>
      </main>
    </div>
  );
}
