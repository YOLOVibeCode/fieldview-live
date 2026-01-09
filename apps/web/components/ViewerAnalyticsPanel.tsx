'use client';

/**
 * Viewer Analytics Panel
 * 
 * Shows active viewers with green/red status indicators.
 * Privacy-first: No IP/location tracking.
 * 
 * Features:
 * - Real-time viewer list
 * - Active/inactive status (green/red)
 * - Auto-refresh every 10 seconds
 * - Total active count
 * - Automation-friendly
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Circle } from 'lucide-react';

interface Viewer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  lastSeenAt: string;
  isActive: boolean;
}

interface ViewerAnalyticsPanelProps {
  slug: string;
}

export function ViewerAnalyticsPanel({ slug }: ViewerAnalyticsPanelProps) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [totalActive, setTotalActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

  useEffect(() => {
    fetchViewers();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchViewers, 10000);
    return () => clearInterval(interval);
  }, [slug]);

  const fetchViewers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/direct/${slug}/viewers/active`);
      
      if (!response.ok) {
        throw new Error('Failed to load viewers');
      }

      const data = await response.json();
      setViewers(data.viewers);
      setTotalActive(data.totalActive);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSince = (lastSeenAt: string): string => {
    const seconds = Math.floor((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
    
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading) {
    return (
      <Card data-testid="viewer-analytics-loading" className="bg-elevated border-outline">
        <CardContent className="p-6">
          <p className="text-muted">Loading viewer analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="viewer-analytics-panel" className="bg-elevated border-outline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Active Viewers
          <span 
            data-testid="total-active-count"
            className="ml-auto text-lg font-mono bg-primary/10 px-3 py-1 rounded-full"
          >
            {totalActive}
          </span>
        </CardTitle>
        <CardDescription>
          Viewers active in the last 2 minutes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p data-testid="error-viewer-analytics" className="text-destructive text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {viewers.length === 0 ? (
          <p data-testid="no-viewers" className="text-muted text-center py-8">
            No active viewers yet
          </p>
        ) : (
          <div data-testid="viewer-list" className="space-y-2 max-h-[400px] overflow-y-auto">
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                data-testid={`viewer-${viewer.email}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-outline hover:bg-background/70 transition-colors"
              >
                {/* Status Indicator */}
                <div
                  data-testid={`status-${viewer.email}`}
                  className="relative"
                  aria-label={viewer.isActive ? 'Active' : 'Inactive'}
                >
                  <Circle
                    className={`h-3 w-3 ${
                      viewer.isActive
                        ? 'fill-green-500 text-green-500'
                        : 'fill-red-500 text-red-500'
                    }`}
                  />
                  {viewer.isActive && (
                    <Circle className="absolute inset-0 h-3 w-3 fill-green-500 text-green-500 animate-ping opacity-75" />
                  )}
                </div>

                {/* Viewer Info */}
                <div className="flex-1 min-w-0">
                  <div 
                    data-testid={`name-${viewer.email}`}
                    className="font-medium truncate"
                  >
                    {viewer.firstName} {viewer.lastName}
                  </div>
                  <div 
                    data-testid={`email-${viewer.email}`}
                    className="text-xs text-muted truncate"
                  >
                    {viewer.email}
                  </div>
                </div>

                {/* Last Seen */}
                <div 
                  data-testid={`last-seen-${viewer.email}`}
                  className="text-xs text-muted tabular-nums"
                >
                  {getTimeSince(viewer.lastSeenAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

