/**
 * AdminPanel Component (JWT-based Authentication)
 * 
 * Password-protected admin dashboard for managing stream settings.
 * Uses JWT token-based authentication for secure API access.
 * 
 * Features:
 * - Stream URL management
 * - Paywall settings (enable/disable, price, message)
 * - Chat toggle
 * - Save payment info option
 */

'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface AdminPanelProps {
  slug: string;
  initialSettings?: {
    streamUrl?: string | null;
    chatEnabled?: boolean;
    paywallEnabled?: boolean;
    priceInCents?: number;
    paywallMessage?: string | null;
    allowSavePayment?: boolean;
    scoreboardEnabled?: boolean;
    homeTeamName?: string;
    awayTeamName?: string;
    homeJerseyColor?: string;
    awayJerseyColor?: string;
    // 🆕 Viewer editing permissions
    allowViewerScoreEdit?: boolean;
    allowViewerNameEdit?: boolean;
  };
  onAuthSuccess?: (token: string) => void;
}

export function AdminPanel({ slug, initialSettings, onAuthSuccess }: AdminPanelProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Settings state
  const [streamUrl, setStreamUrl] = useState(initialSettings?.streamUrl || '');
  const [chatEnabled, setChatEnabled] = useState(initialSettings?.chatEnabled ?? true);
  const [paywallEnabled, setPaywallEnabled] = useState(initialSettings?.paywallEnabled ?? false);
  const [price, setPrice] = useState(
    initialSettings?.priceInCents ? (initialSettings.priceInCents / 100).toFixed(2) : '0.00'
  );
  const [paywallMessage, setPaywallMessage] = useState(initialSettings?.paywallMessage || '');
  const [allowSavePayment, setAllowSavePayment] = useState(initialSettings?.allowSavePayment ?? false);
  const [scoreboardEnabled, setScoreboardEnabled] = useState(initialSettings?.scoreboardEnabled ?? false);
  const [homeTeamName, setHomeTeamName] = useState(initialSettings?.homeTeamName || '');
  const [awayTeamName, setAwayTeamName] = useState(initialSettings?.awayTeamName || '');
  const [homeJerseyColor, setHomeJerseyColor] = useState(initialSettings?.homeJerseyColor || '#003366');
  const [awayJerseyColor, setAwayJerseyColor] = useState(initialSettings?.awayJerseyColor || '#CC0000');
  // 🆕 Viewer editing permissions
  const [allowViewerScoreEdit, setAllowViewerScoreEdit] = useState(initialSettings?.allowViewerScoreEdit ?? false);
  const [allowViewerNameEdit, setAllowViewerNameEdit] = useState(initialSettings?.allowViewerNameEdit ?? false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    setUnlockError('');
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
      const response = await fetch(`${apiUrl}/api/direct/${slug}/unlock-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlock admin panel');
      }

      // Store the JWT token and unlock the panel
      setAdminToken(data.token);
      setIsUnlocked(true);
      setPassword(''); // Clear password from state for security
      
      // Notify parent component
      onAuthSuccess?.(data.token);
    } catch (error) {
      setUnlockError(error instanceof Error ? error.message : 'Failed to unlock admin panel');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSave = async () => {
    if (!adminToken) {
      setSaveError('Not authenticated');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Parse price
      const priceInCents = Math.round(parseFloat(price) * 100);
      
      if (isNaN(priceInCents) || priceInCents < 0) {
        setSaveError('Invalid price format');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';
      const response = await fetch(`${apiUrl}/api/direct/${slug}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          streamUrl: streamUrl || null,
          chatEnabled,
          paywallEnabled,
          priceInCents,
          paywallMessage: paywallMessage || null,
          allowSavePayment,
          // 🆕 Viewer editing permissions
          allowViewerScoreEdit,
          allowViewerNameEdit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, require re-authentication
          setIsUnlocked(false);
          setAdminToken(null);
          setUnlockError('Session expired. Please log in again.');
        }
        throw new Error(data.error || 'Failed to save settings');
      }

      // If scoreboard is enabled, initialize it with custom values
      if (scoreboardEnabled) {
        const scoreboardResponse = await fetch(`${apiUrl}/api/direct/${slug}/scoreboard/setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            homeTeamName: homeTeamName || 'Home',
            awayTeamName: awayTeamName || 'Away',
            homeJerseyColor: homeJerseyColor || '#003366',
            awayJerseyColor: awayJerseyColor || '#CC0000',
            homeScore: 0,
            awayScore: 0,
            clockMode: 'stopped',
            clockSeconds: 0,
            isVisible: true,
            position: 'top',
            editMode: homeTeamName || awayTeamName ? 'admin_only' : 'public', // If coach set names, lock it. Otherwise, public!
          }),
        });

        if (!scoreboardResponse.ok) {
          const scoreboardData = await scoreboardResponse.json();
          // Don't fail the whole save, just warn
          console.warn('Failed to setup scoreboard:', scoreboardData);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Refresh to show new settings
      }, 1000);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isUnlocked) {
    return (
      <Card className="glass border border-primary/20 shadow-elevation-2" data-testid="admin-panel-unlock">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <CardTitle>Edit Stream Settings</CardTitle>
          </div>
          <CardDescription>
            Enter admin password to manage stream settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnlock} className="space-y-4" data-testid="admin-unlock-form">
            <div className="space-y-2">
              <label htmlFor="admin-password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="admin-password"
                  name="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="pr-10"
                  data-testid="admin-password-input"
                  autoComplete="off"
                  aria-label="Admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  data-testid="toggle-password-visibility"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {unlockError && (
              <div 
                className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded" 
                role="alert"
                data-testid="unlock-error-message"
              >
                {unlockError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isUnlocking || !password}
              data-testid="unlock-admin-button"
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Admin Panel'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Admin panel unlocked - show settings
  return (
    <Card className="glass border border-primary/20 shadow-elevation-2" data-testid="admin-panel-settings">
      <CardHeader>
        <CardTitle>Stream Settings</CardTitle>
        <CardDescription>
          Manage stream URL, paywall, and chat settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stream URL */}
        <div className="space-y-2">
          <label htmlFor="stream-url" className="text-sm font-medium">
            Stream URL (HLS .m3u8)
          </label>
          <Input
            id="stream-url"
            name="stream-url"
            type="url"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://stream.mux.com/your-stream.m3u8"
            data-testid="stream-url-input"
            aria-label="Stream URL"
          />
        </div>

        {/* Chat Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="chat-enabled" className="text-sm font-medium">
              Enable Chat
            </label>
            <p className="text-xs text-muted-foreground">Allow viewers to chat</p>
          </div>
          <input
            id="chat-enabled"
            name="chat-enabled"
            type="checkbox"
            checked={chatEnabled}
            onChange={(e) => setChatEnabled(e.target.checked)}
            className="w-5 h-5"
            data-testid="chat-enabled-checkbox"
            aria-label="Enable chat"
          />
        </div>

        {/* Scoreboard Settings */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="scoreboard-enabled" className="text-sm font-medium">
                Enable Scoreboard
              </label>
              <p className="text-xs text-muted-foreground">Show live game score and clock</p>
            </div>
            <input
              id="scoreboard-enabled"
              name="scoreboard-enabled"
              type="checkbox"
              checked={scoreboardEnabled}
              onChange={(e) => setScoreboardEnabled(e.target.checked)}
              className="w-5 h-5"
              data-testid="scoreboard-enabled-checkbox"
              aria-label="Enable scoreboard"
            />
          </div>

          {scoreboardEnabled && (
            <>
              <div className="space-y-2">
                <label htmlFor="home-team-name" className="text-sm font-medium">
                  Home Team Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="home-team-name"
                  name="home-team-name"
                  type="text"
                  value={homeTeamName}
                  onChange={(e) => setHomeTeamName(e.target.value)}
                  placeholder="Home (default)"
                  data-testid="home-team-name-input"
                  aria-label="Home team name"
                  className="bg-background border-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for default. Can be edited by social producers.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="away-team-name" className="text-sm font-medium">
                  Away Team Name <span className="text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="away-team-name"
                  name="away-team-name"
                  type="text"
                  value={awayTeamName}
                  onChange={(e) => setAwayTeamName(e.target.value)}
                  placeholder="Away (default)"
                  data-testid="away-team-name-input"
                  aria-label="Away team name"
                  className="bg-background border-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="home-jersey-color" className="text-sm font-medium">
                    Home Color
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="home-jersey-color"
                      name="home-jersey-color"
                      type="color"
                      value={homeJerseyColor}
                      onChange={(e) => setHomeJerseyColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                      data-testid="home-jersey-color-input"
                      aria-label="Home jersey color"
                    />
                    <Input
                      type="text"
                      value={homeJerseyColor}
                      onChange={(e) => setHomeJerseyColor(e.target.value)}
                      placeholder="#003366"
                      className="flex-1 bg-background border-muted"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="away-jersey-color" className="text-sm font-medium">
                    Away Color
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="away-jersey-color"
                      name="away-jersey-color"
                      type="color"
                      value={awayJerseyColor}
                      onChange={(e) => setAwayJerseyColor(e.target.value)}
                      className="w-16 h-10 cursor-pointer"
                      data-testid="away-jersey-color-input"
                      aria-label="Away jersey color"
                    />
                    <Input
                      type="text"
                      value={awayJerseyColor}
                      onChange={(e) => setAwayJerseyColor(e.target.value)}
                      placeholder="#CC0000"
                      className="flex-1 bg-background border-muted"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                💡 <strong>Tip:</strong> If you don't set team names/colors, the Social Producer Panel will use defaults (Home/Away, Navy/Red). Anyone can customize them later!
              </p>

              {/* 🆕 Viewer Editing Permissions */}
              <div className="space-y-4 border-t pt-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="allow-viewer-score-edit" className="text-sm font-medium">
                      Allow Viewers to Edit Scores
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Registered viewers can tap +/− buttons to adjust scores
                    </p>
                  </div>
                  <input
                    id="allow-viewer-score-edit"
                    name="allow-viewer-score-edit"
                    type="checkbox"
                    checked={allowViewerScoreEdit}
                    onChange={(e) => setAllowViewerScoreEdit(e.target.checked)}
                    className="w-5 h-5"
                    data-testid="allow-viewer-score-edit-checkbox"
                    aria-label="Allow viewers to edit scores"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="allow-viewer-name-edit" className="text-sm font-medium">
                      Allow Viewers to Edit Team Names
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Registered viewers can click team names to edit
                    </p>
                  </div>
                  <input
                    id="allow-viewer-name-edit"
                    name="allow-viewer-name-edit"
                    type="checkbox"
                    checked={allowViewerNameEdit}
                    onChange={(e) => setAllowViewerNameEdit(e.target.checked)}
                    className="w-5 h-5"
                    data-testid="allow-viewer-name-edit-checkbox"
                    aria-label="Allow viewers to edit team names"
                  />
                </div>

                <p className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/30 p-2 rounded">
                  🎉 <strong>Social Editing:</strong> These features allow your audience to participate! Great for community streams.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Paywall Settings */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="paywall-enabled" className="text-sm font-medium">
                Enable Paywall
              </label>
              <p className="text-xs text-muted-foreground">Require payment to access stream</p>
            </div>
            <input
              id="paywall-enabled"
              name="paywall-enabled"
              type="checkbox"
              checked={paywallEnabled}
              onChange={(e) => setPaywallEnabled(e.target.checked)}
              className="w-5 h-5"
              data-testid="paywall-enabled-checkbox"
              aria-label="Enable paywall"
            />
          </div>

          {paywallEnabled && (
            <>
              <div className="space-y-2">
                <label htmlFor="paywall-price" className="text-sm font-medium">
                  Price (USD)
                </label>
                <Input
                  id="paywall-price"
                  name="paywall-price"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  data-testid="paywall-price-input"
                  aria-label="Paywall price in USD"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="paywall-message" className="text-sm font-medium">
                  Paywall Message (optional, max 1000 chars)
                </label>
                <textarea
                  id="paywall-message"
                  name="paywall-message"
                  value={paywallMessage}
                  onChange={(e) => setPaywallMessage(e.target.value)}
                  placeholder="Explain why you're charging for this stream..."
                  maxLength={1000}
                  rows={3}
                  className="w-full px-3 py-2 border border-input bg-input rounded-md text-sm"
                  data-testid="paywall-message-textarea"
                  aria-label="Paywall message"
                />
                <p className="text-xs text-muted-foreground">
                  {paywallMessage.length} / 1000 characters
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="allow-save-payment" className="text-sm font-medium">
                    Allow Save Payment Info
                  </label>
                  <p className="text-xs text-muted-foreground">Let viewers save cards for future purchases</p>
                </div>
                <input
                  id="allow-save-payment"
                  name="allow-save-payment"
                  type="checkbox"
                  checked={allowSavePayment}
                  onChange={(e) => setAllowSavePayment(e.target.checked)}
                  className="w-5 h-5"
                  data-testid="allow-save-payment-checkbox"
                  aria-label="Allow save payment info"
                />
              </div>
            </>
          )}
        </div>

        {/* Save Button */}
        <div className="space-y-2">
          {saveError && (
            <div 
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded" 
              role="alert"
              data-testid="save-error-message"
            >
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div 
              className="text-sm text-success bg-success/10 border border-success/30 px-3 py-2 rounded"
              data-testid="save-success-message"
            >
              Settings saved successfully! Refreshing...
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full"
            data-testid="save-settings-button"
            aria-label="Save stream settings"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
