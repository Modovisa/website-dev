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
