'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Play, Pause, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface GameScoreboard {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeJerseyColor: string;
  awayJerseyColor: string;
  homeScore: number;
  awayScore: number;
  clockMode: 'stopped' | 'running' | 'paused';
  clockSeconds: number;
  clockStartedAt: string | null;
  isVisible: boolean;
  position: string;
  editMode: 'admin_only' | 'public' | 'password';
  lastEditedBy: string | null;
  lastEditedAt: string | null;
}

interface SocialProducerPanelProps {
  slug: string;
  isAdmin: boolean;
  adminJwt?: string;
}

export function SocialProducerPanel({ slug, isAdmin, adminJwt }: SocialProducerPanelProps) {
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

  // Fetch scoreboard data
  useEffect(() => {
    fetchScoreboard();
  }, [slug]);

  const fetchScoreboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard`);
      
      // Handle 404 gracefully - no scoreboard is not an error
      if (response.status === 404) {
        console.log('[SocialProducerPanel] No scoreboard found, showing empty state');
        setScoreboard(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        // Only show error for actual errors (5xx), not missing data
        throw new Error(`Failed to load scoreboard: ${response.statusText}`);
      }

      const data = await response.json();
      setScoreboard(data);
      setError(null);
      
      // Check if panel is publicly accessible
      if (data.editMode === 'public') {
        setIsLocked(false);
      }
    } catch (err) {
      // Only set error for real errors, not missing data or network issues
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.includes('Failed to fetch')) {
        console.warn('[SocialProducerPanel] Network error, will retry:', errorMessage);
        setError(null); // Don't show red error for network issues
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const unlockPanel = async () => {
    if (!scoreboard) return;

    // Admin with JWT can always unlock
    if (isAdmin && adminJwt) {
      setIsLocked(false);
      setPasswordError(null);
      return;
    }

    // For password-protected panels
    if (scoreboard.editMode === 'password') {
      try {
        const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ producerPassword: password }),
        });

        if (!response.ok) {
          setPasswordError('Incorrect password');
          return;
        }

        setIsLocked(false);
        setPasswordError(null);
      } catch (err) {
        setPasswordError('Failed to validate password');
      }
    }
  };

  const updateScoreboard = async (updates: Partial<GameScoreboard>) => {
    if (!scoreboard) return;

    try {
      setSaving(true);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Include admin JWT if available
      if (isAdmin && adminJwt) {
        headers['Authorization'] = `Bearer ${adminJwt}`;
      }

      // Include producer password if not admin
      const body: any = { ...updates };
      if (!isAdmin && scoreboard.editMode === 'password') {
        body.producerPassword = password;
      }

      const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to update scoreboard');
      }

      const updated = await response.json();
      setScoreboard(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const controlClock = async (action: 'start' | 'pause' | 'reset') => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (isAdmin && adminJwt) {
        headers['Authorization'] = `Bearer ${adminJwt}`;
      }

      const body: any = {};
      if (!isAdmin && scoreboard?.editMode === 'password') {
        body.producerPassword = password;
      }

      const response = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard/clock/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} clock`);
      }

      const updated = await response.json();
      setScoreboard(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} clock`);
    }
  };

  const incrementScore = (team: 'home' | 'away', delta: number) => {
    if (!scoreboard) return;
    
    const key = team === 'home' ? 'homeScore' : 'awayScore';
    const newScore = Math.max(0, scoreboard[key] + delta);
    updateScoreboard({ [key]: newScore });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentClockSeconds = (): number => {
    if (!scoreboard) return 0;
    
    if (scoreboard.clockMode === 'running' && scoreboard.clockStartedAt) {
      const elapsed = Math.floor((Date.now() - new Date(scoreboard.clockStartedAt).getTime()) / 1000);
      return scoreboard.clockSeconds + elapsed;
    }
    
    return scoreboard.clockSeconds;
  };

  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    if (scoreboard?.clockMode === 'running') {
      const interval = setInterval(() => {
        setDisplayTime(getCurrentClockSeconds());
      }, 100);
      return () => clearInterval(interval);
    } else {
      setDisplayTime(getCurrentClockSeconds());
    }
  }, [scoreboard]);

  if (loading) {
    return (
      <Card data-testid="producer-panel-loading" className="bg-elevated border-outline">
        <CardContent className="p-6">
          <p className="text-muted">Loading producer panel...</p>
        </CardContent>
      </Card>
    );
  }

  // Don't show error if scoreboard simply doesn't exist - that's OK
  // Show empty state instead
  if (!scoreboard && !error) {
    return (
      <Card data-testid="producer-panel-empty" className="bg-elevated border-outline">
        <CardContent className="p-6">
          <p className="text-muted-foreground text-sm">Scoreboard not configured for this stream.</p>
        </CardContent>
      </Card>
    );
  }
  
  // Only show error for critical failures (5xx)
  if (error && (error.includes('500') || error.includes('Internal Server Error'))) {
    return (
      <Card data-testid="producer-panel-error" className="bg-elevated border-outline">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p data-testid="error-message">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLocked && scoreboard?.editMode !== 'public') {
    return (
      <Card data-testid="producer-panel-locked" className="bg-elevated border-outline">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Producer Panel Locked
          </CardTitle>
          <CardDescription>
            {isAdmin ? 'Admin access available' : 'Enter password to edit scoreboard'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && scoreboard?.editMode === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="producer-password">Producer Password</Label>
              <Input
                id="producer-password"
                data-testid="input-producer-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && unlockPanel()}
                placeholder="Enter password"
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && (
                <p id="password-error" data-testid="error-password" className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>
          )}
          <Button
            data-testid="btn-unlock-panel"
            onClick={unlockPanel}
            className="w-full"
            aria-label="Unlock producer panel"
          >
            Unlock Panel
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scoreboard) return null;

  return (
    <Card data-testid="producer-panel" className="bg-elevated border-outline">
      <CardHeader>
        <CardTitle>Social Producer Panel</CardTitle>
        <CardDescription>
          {scoreboard.editMode === 'public' && 'Anyone can edit'}
          {scoreboard.editMode === 'password' && 'Password protected'}
          {scoreboard.editMode === 'admin_only' && 'Admin only'}
          {scoreboard.lastEditedBy && (
            <span className="text-xs text-muted ml-2">
              Last edited by: {scoreboard.lastEditedBy}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div data-testid="error-update" className="flex items-center gap-2 text-destructive text-sm" role="alert">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
          </div>
        )}

        {/* Team Names and Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="home-team-name">Home Team</Label>
            <Input
              id="home-team-name"
              data-testid="input-home-team-name"
              value={scoreboard.homeTeamName}
              onChange={(e) => updateScoreboard({ homeTeamName: e.target.value })}
              disabled={saving}
            />
            <Label htmlFor="home-jersey-color">Jersey Color</Label>
            <div className="flex gap-2">
              <Input
                id="home-jersey-color"
                data-testid="input-home-jersey-color"
                type="color"
                value={scoreboard.homeJerseyColor}
                onChange={(e) => updateScoreboard({ homeJerseyColor: e.target.value })}
                disabled={saving}
                className="w-20 h-10"
              />
              <Input
                data-testid="input-home-jersey-color-text"
                type="text"
                value={scoreboard.homeJerseyColor}
                onChange={(e) => updateScoreboard({ homeJerseyColor: e.target.value })}
                disabled={saving}
                placeholder="#1E40AF"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="away-team-name">Away Team</Label>
            <Input
              id="away-team-name"
              data-testid="input-away-team-name"
              value={scoreboard.awayTeamName}
              onChange={(e) => updateScoreboard({ awayTeamName: e.target.value })}
              disabled={saving}
            />
            <Label htmlFor="away-jersey-color">Jersey Color</Label>
            <div className="flex gap-2">
              <Input
                id="away-jersey-color"
                data-testid="input-away-jersey-color"
                type="color"
                value={scoreboard.awayJerseyColor}
                onChange={(e) => updateScoreboard({ awayJerseyColor: e.target.value })}
                disabled={saving}
                className="w-20 h-10"
              />
              <Input
                data-testid="input-away-jersey-color-text"
                type="text"
                value={scoreboard.awayJerseyColor}
                onChange={(e) => updateScoreboard({ awayJerseyColor: e.target.value })}
                disabled={saving}
                placeholder="#DC2626"
              />
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Home Score</Label>
            <div className="flex items-center gap-2">
              <Button
                data-testid="btn-home-score-minus"
                onClick={() => incrementScore('home', -1)}
                disabled={saving}
                variant="outline"
                size="sm"
                aria-label="Decrease home score"
              >
                -
              </Button>
              <Input
                data-testid="input-home-score"
                type="number"
                value={scoreboard.homeScore}
                onChange={(e) => updateScoreboard({ homeScore: parseInt(e.target.value) || 0 })}
                disabled={saving}
                className="text-center text-2xl font-bold"
                aria-label="Home team score"
              />
              <Button
                data-testid="btn-home-score-plus"
                onClick={() => incrementScore('home', 1)}
                disabled={saving}
                variant="outline"
                size="sm"
                aria-label="Increase home score"
              >
                +
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Away Score</Label>
            <div className="flex items-center gap-2">
              <Button
                data-testid="btn-away-score-minus"
                onClick={() => incrementScore('away', -1)}
                disabled={saving}
                variant="outline"
                size="sm"
                aria-label="Decrease away score"
              >
                -
              </Button>
              <Input
                data-testid="input-away-score"
                type="number"
                value={scoreboard.awayScore}
                onChange={(e) => updateScoreboard({ awayScore: parseInt(e.target.value) || 0 })}
                disabled={saving}
                className="text-center text-2xl font-bold"
                aria-label="Away team score"
              />
              <Button
                data-testid="btn-away-score-plus"
                onClick={() => incrementScore('away', 1)}
                disabled={saving}
                variant="outline"
                size="sm"
                aria-label="Increase away score"
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Clock */}
        <div className="space-y-3">
          <Label>Game Clock</Label>
          <div 
            data-testid="clock-display" 
            className="text-4xl font-mono font-bold text-center p-4 bg-background/50 rounded-lg border border-outline"
            aria-live="polite"
            aria-atomic="true"
          >
            {formatTime(displayTime)}
          </div>
          <div className="flex gap-2">
            {scoreboard.clockMode !== 'running' && (
              <Button
                data-testid="btn-clock-start"
                onClick={() => controlClock('start')}
                className="flex-1"
                aria-label="Start clock"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
            )}
            {scoreboard.clockMode === 'running' && (
              <Button
                data-testid="btn-clock-pause"
                onClick={() => controlClock('pause')}
                className="flex-1"
                variant="secondary"
                aria-label="Pause clock"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            )}
            <Button
              data-testid="btn-clock-reset"
              onClick={() => controlClock('reset')}
              variant="outline"
              aria-label="Reset clock"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="visibility-toggle">Scoreboard Visible to Viewers</Label>
          <Button
            id="visibility-toggle"
            data-testid="btn-toggle-visibility"
            onClick={() => updateScoreboard({ isVisible: !scoreboard.isVisible })}
            variant={scoreboard.isVisible ? "default" : "outline"}
            size="sm"
            aria-label={scoreboard.isVisible ? "Hide scoreboard" : "Show scoreboard"}
            aria-pressed={scoreboard.isVisible}
          >
            {scoreboard.isVisible ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Visible
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hidden
              </>
            )}
          </Button>
        </div>

        {saving && (
          <p data-testid="saving-indicator" className="text-sm text-muted text-center" aria-live="polite">
            Saving...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

