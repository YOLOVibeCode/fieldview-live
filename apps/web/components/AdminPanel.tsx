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

import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeftRight, Eye, EyeOff, Lock } from 'lucide-react';
import { apiRequest } from '@/lib/api-client';
import { getUserFriendlyMessage } from '@/lib/error-messages';
import { ErrorToast } from '@/components/v2/ErrorToast';

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
    // Viewer editing permissions
    allowViewerScoreEdit?: boolean;
    allowViewerNameEdit?: boolean;
    // Anonymous feature flags
    allowAnonymousChat?: boolean;
    allowAnonymousScoreEdit?: boolean;
    welcomeMessage?: string | null;
    // Scheduling & reminders
    scheduledStartAt?: string | null;
    sendReminders?: boolean;
    reminderMinutes?: number;
  };
  onAuthSuccess?: (token: string, viewerInfo?: { viewerToken: string; viewerId: string; displayName: string; gameId: string }) => void;
}

export function AdminPanel({ slug, initialSettings, onAuthSuccess }: AdminPanelProps) {
  console.log('[AdminPanel] 🎬 Component mounted/rendered', {
    slug,
    hasInitialSettings: !!initialSettings,
    initialStreamUrl: initialSettings?.streamUrl || null
  });
  
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
  const [awayColorTouched, setAwayColorTouched] = useState(false);
  // Viewer editing permissions
  const [allowViewerScoreEdit, setAllowViewerScoreEdit] = useState(initialSettings?.allowViewerScoreEdit ?? false);
  const [allowViewerNameEdit, setAllowViewerNameEdit] = useState(initialSettings?.allowViewerNameEdit ?? false);
  // Anonymous feature flags
  const [allowAnonymousChat, setAllowAnonymousChat] = useState(initialSettings?.allowAnonymousChat ?? false);
  const [allowAnonymousScoreEdit, setAllowAnonymousScoreEdit] = useState(initialSettings?.allowAnonymousScoreEdit ?? false);
  const [welcomeMessage, setWelcomeMessage] = useState(initialSettings?.welcomeMessage ?? '');
  // Scheduling & reminders
  const [scheduledStartAt, setScheduledStartAt] = useState(() => {
    if (!initialSettings?.scheduledStartAt) return '';
    // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:MM)
    const d = new Date(initialSettings.scheduledStartAt);
    return d.toISOString().slice(0, 16);
  });
  const [sendReminders, setSendReminders] = useState(initialSettings?.sendReminders ?? true);
  const [reminderMinutes, setReminderMinutes] = useState(initialSettings?.reminderMinutes ?? 5);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastError, setToastError] = useState<string | null>(null);

  // Broadcast message (admin-only, visible to all viewers)
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');

  const ownerUnlockAttempted = useRef(false);

  // Auto-unlock with owner JWT when available (no password prompt)
  useEffect(() => {
    if (isUnlocked || ownerUnlockAttempted.current || typeof window === 'undefined') return;
    const ownerToken = localStorage.getItem('owner_token');
    if (!ownerToken) return;
    ownerUnlockAttempted.current = true;
    setIsUnlocking(true);
    const fullSlug = slug.toLowerCase();
    
    apiRequest<{
      token: string;
      viewerToken?: string;
      viewerId?: string;
      displayName?: string;
      gameId?: string;
    }>(`/api/direct/${encodeURIComponent(fullSlug)}/unlock-admin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({}),
    })
      .then((data) => {
        if (data.token) {
          setAdminToken(data.token);
          setIsUnlocked(true);
          const viewerInfo = data.viewerToken
            ? {
                viewerToken: data.viewerToken as string,
                viewerId: data.viewerId as string,
                displayName: data.displayName as string,
                gameId: data.gameId as string,
              }
            : undefined;
          onAuthSuccess?.(data.token, viewerInfo);
        }
      })
      .catch((err) => {
        setToastError(getUserFriendlyMessage(err));
      })
      .finally(() => setIsUnlocking(false));
  }, [isUnlocked, slug, onAuthSuccess]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Use full slug for unlock endpoint (e.g., "tchs/soccer-20260122-jv2")
    // The API will find the DirectStream by full slug
    const fullSlug = slug.toLowerCase();
    
    console.log('[AdminPanel] 🔐 Unlock attempt started', {
      slug,
      fullSlug,
      passwordLength: password.length,
      hasPassword: password.length > 0
    });
    
    setIsUnlocking(true);
    setUnlockError('');
    
    try {
      const data = await apiRequest<{
        token: string;
        viewerToken?: string;
        viewerId?: string;
        displayName?: string;
        gameId?: string;
        error?: string;
      }>(`/api/direct/${encodeURIComponent(fullSlug)}/unlock-admin`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      console.log('[AdminPanel] 📥 Unlock response received', {
        hasToken: !!data.token,
        hasError: !!data.error,
        error: data.error
      });

      // Store the JWT token and unlock the panel
      setAdminToken(data.token);
      setIsUnlocked(true);
      setPassword(''); // Clear password from state for security

      console.log('[AdminPanel] ✅ Admin panel unlocked successfully');

      // Notify parent component with admin token + viewer info for auto-login
      const viewerInfo = data.viewerToken ? {
        viewerToken: data.viewerToken as string,
        viewerId: data.viewerId as string,
        displayName: data.displayName as string,
        gameId: data.gameId as string,
      } : undefined;
      onAuthSuccess?.(data.token, viewerInfo);
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(error);
      console.error('[AdminPanel] ❌ Unlock error caught', {
        error,
        errorMessage,
        errorType: error?.constructor?.name
      });
      setUnlockError(errorMessage);
    } finally {
      setIsUnlocking(false);
      console.log('[AdminPanel] 🏁 Unlock attempt finished', {
        isUnlocked,
        hasError: !!unlockError
      });
    }
  };

  const handleSave = async () => {
    // Use full slug for settings endpoint (e.g., "tchs/soccer-20260122-jv2")
    // JWT token is issued for the full slug, matching the DirectStream in database
    const fullSlug = slug.toLowerCase();
    
    console.log('[AdminPanel] 💾 Save settings attempt started', {
      slug,
      fullSlug,
      hasToken: !!adminToken,
      streamUrl: streamUrl || null,
      chatEnabled,
      scoreboardEnabled,
      paywallEnabled
    });
    
    if (!adminToken) {
      console.error('[AdminPanel] ❌ No admin token - not authenticated');
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
        console.error('[AdminPanel] ❌ Invalid price format', { price, priceInCents });
        setSaveError('Invalid price format');
        return;
      }

      const payload = {
        streamUrl: streamUrl || null,
        chatEnabled,
        paywallEnabled,
        priceInCents,
        paywallMessage: paywallMessage || null,
        allowSavePayment,
        allowViewerScoreEdit,
        allowViewerNameEdit,
        allowAnonymousChat,
        allowAnonymousScoreEdit,
        welcomeMessage: welcomeMessage.trim() || null,
        // Scheduling & reminders
        scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : null,
        sendReminders,
        reminderMinutes,
      };

      console.log('[AdminPanel] 📤 Sending settings update', {
        payload,
        streamUrlProvided: !!streamUrl,
        streamUrlLength: streamUrl?.length || 0,
        fullSlug
      });

      // Use full slug for settings endpoint (JWT token is for full slug)
      const data = await apiRequest<{
        success: boolean;
        settings?: { streamUrl?: string };
        error?: string;
        details?: unknown;
      }>(`/api/direct/${encodeURIComponent(fullSlug)}/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('[AdminPanel] 📥 Settings response received');
      
      console.log('[AdminPanel] 📦 Settings response data', {
        success: data.success,
        hasError: !!data.error,
        error: data.error,
        streamUrlSaved: data.settings?.streamUrl
      });

      // If scoreboard is enabled, initialize it with custom values
      if (scoreboardEnabled) {
        console.log('[AdminPanel] 📊 Setting up scoreboard', {
          homeTeam: homeTeamName || 'Home',
          awayTeam: awayTeamName || 'Away'
        });
        
        try {
          await apiRequest<unknown>(`/api/direct/${encodeURIComponent(fullSlug)}/scoreboard/setup`, {
            method: 'POST',
            headers: {
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
          
          console.log('[AdminPanel] ✅ Scoreboard setup successful');
        } catch (scoreboardError) {
          // Don't fail the whole save, just warn
          console.warn('[AdminPanel] ⚠️ Failed to setup scoreboard:', scoreboardError);
        }
      }

      console.log('[AdminPanel] ✅ Settings saved successfully');
      setSaveSuccess(true);
      setTimeout(() => {
        console.log('[AdminPanel] 🔄 Reloading page to show new settings');
        window.location.reload(); // Refresh to show new settings
      }, 1000);
    } catch (error) {
      const errorMessage = getUserFriendlyMessage(error);
      console.error('[AdminPanel] ❌ Save settings error', {
        error,
        errorMessage,
        errorType: error?.constructor?.name
      });
      
      // Check for token expiration
      if (error.status === 401) {
        console.error('[AdminPanel] ❌ Token expired (401)');
        setIsUnlocked(false);
        setAdminToken(null);
        setUnlockError('Session expired. Please log in again.');
      }
      
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
      console.log('[AdminPanel] 🏁 Save settings finished', {
        saveSuccess,
        saveError
      });
    }
  };

  if (!isUnlocked) {
    return (
      <>
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
                ref={(el) => {
                  if (el) {
                    console.error('[AdminPanel] 🔴 RED ERROR DISPLAYED:', {
                      type: 'unlock',
                      message: unlockError,
                      timestamp: new Date().toISOString()
                    });
                  }
                }}
              >
                {unlockError}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isUnlocking || !password}
              data-testid="unlock-admin-button"
              onClick={() => {
                console.log('[AdminPanel] 🖱️  Unlock button clicked', {
                  passwordLength: password.length,
                  isUnlocking,
                  buttonDisabled: isUnlocking || !password
                });
              }}
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Admin Panel'}
            </Button>
          </form>
        </CardContent>
      </Card>
      {toastError && (
        <ErrorToast
          message={toastError}
          onDismiss={() => setToastError(null)}
          data-testid="error-toast-admin-unlock"
        />
      )}
      </>
    );
  }

  // Admin panel unlocked - show settings
  return (
    <>
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

        {/* Broadcast Message - visible to all viewers as overlay + in chat */}
        <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <label htmlFor="broadcast-message" className="text-sm font-medium">
            Broadcast Message
          </label>
          <p className="text-xs text-muted-foreground">
            Sends a message to all viewers (overlay on video + in chat). Max 240 characters.
          </p>
          <div className="flex gap-2">
            <Input
              id="broadcast-message"
              name="broadcast-message"
              type="text"
              value={broadcastMessage}
              onChange={(e) => {
                setBroadcastMessage(e.target.value.slice(0, 240));
                setBroadcastError('');
              }}
              placeholder="e.g. Stream starts in 5 minutes"
              maxLength={240}
              className="flex-1"
              data-testid="input-broadcast-message"
              aria-label="Broadcast message"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isBroadcasting || !broadcastMessage.trim()}
              onClick={async () => {
                const fullSlug = slug.toLowerCase();
                if (!adminToken) return;
                setIsBroadcasting(true);
                setBroadcastError('');
                try {
                  await apiRequest<unknown>(`/api/direct/${encodeURIComponent(fullSlug)}/admin-broadcast`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ message: broadcastMessage.trim() }),
                  });
                  
                  setBroadcastMessage('');
                } catch (err) {
                  setBroadcastError(getUserFriendlyMessage(err));
                } finally {
                  setIsBroadcasting(false);
                }
              }}
              data-testid="btn-broadcast-message"
              aria-label="Send broadcast to all viewers"
            >
              {isBroadcasting ? 'Sending...' : 'Broadcast'}
            </Button>
          </div>
          {broadcastError && (
            <p className="text-sm text-destructive" data-testid="error-broadcast" role="alert">
              {broadcastError}
            </p>
          )}
        </div>

        {/* Welcome Message - dismissible banner shown to viewers on first load */}
        <div className="space-y-2">
          <label htmlFor="welcome-message" className="text-sm font-medium">
            Welcome Message
          </label>
          <p className="text-xs text-muted-foreground">
            Shown once to viewers when they load the stream. They must dismiss it (×). Max 500 characters. Leave empty to hide.
          </p>
          <textarea
            id="welcome-message"
            name="welcome-message"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value.slice(0, 500))}
            placeholder="e.g. We apologize for the delay. Stream starts at 7:15 PM."
            maxLength={500}
            rows={3}
            className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            data-testid="input-welcome-message"
            aria-label="Welcome message for viewers"
          />
        </div>

        {/* Scheduling & Reminders */}
        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-semibold">Scheduling & Reminders</h4>
          <div className="space-y-2">
            <label htmlFor="scheduled-start" className="text-sm font-medium">
              Scheduled Start Time
            </label>
            <p className="text-xs text-muted-foreground">
              When the stream is expected to start. Viewers can sign up for email reminders.
            </p>
            <input
              id="scheduled-start"
              type="datetime-local"
              value={scheduledStartAt}
              onChange={(e) => setScheduledStartAt(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              data-testid="input-scheduled-start"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="send-reminders" className="text-sm font-medium">
                Send Reminders
              </label>
              <p className="text-xs text-muted-foreground">Email viewers before start time</p>
            </div>
            <input
              id="send-reminders"
              type="checkbox"
              checked={sendReminders}
              onChange={(e) => setSendReminders(e.target.checked)}
              className="w-5 h-5"
              data-testid="send-reminders-checkbox"
            />
          </div>
          {sendReminders && (
            <div className="space-y-2 ml-4">
              <label htmlFor="reminder-minutes" className="text-sm font-medium">
                Remind (minutes before)
              </label>
              <input
                id="reminder-minutes"
                type="number"
                min={1}
                max={1440}
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-md border border-input bg-background text-sm"
                data-testid="input-reminder-minutes"
              />
            </div>
          )}
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

        {/* Anonymous Chat Toggle (shown when chat is enabled) */}
        {chatEnabled && (
          <div className="flex items-center justify-between ml-4">
            <div>
              <label htmlFor="allow-anonymous-chat" className="text-sm font-medium">
                Allow Anonymous Chat
              </label>
              <p className="text-xs text-muted-foreground">
                Anyone can chat without registering their email
              </p>
            </div>
            <input
              id="allow-anonymous-chat"
              name="allow-anonymous-chat"
              type="checkbox"
              checked={allowAnonymousChat}
              onChange={(e) => setAllowAnonymousChat(e.target.checked)}
              className="w-5 h-5"
              data-testid="allow-anonymous-chat-checkbox"
              aria-label="Allow anonymous chat"
            />
          </div>
        )}

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

              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
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
                      onChange={(e) => {
                        const v = e.target.value;
                        setHomeJerseyColor(v);
                        if (!awayColorTouched) setAwayJerseyColor('#FFFFFF');
                      }}
                      className="w-16 h-10 cursor-pointer"
                      data-testid="home-jersey-color-input"
                      aria-label="Home jersey color"
                    />
                    <Input
                      type="text"
                      value={homeJerseyColor}
                      onChange={(e) => {
                        const v = e.target.value;
                        setHomeJerseyColor(v);
                        if (!awayColorTouched) setAwayJerseyColor('#FFFFFF');
                      }}
                      placeholder="#003366"
                      className="flex-1 bg-background border-muted"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    setHomeJerseyColor(awayJerseyColor);
                    setAwayJerseyColor(homeJerseyColor);
                    setHomeTeamName(awayTeamName);
                    setAwayTeamName(homeTeamName);
                    setAwayColorTouched(true);
                  }}
                  data-testid="btn-swap-colors"
                  aria-label="Swap home and away"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

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
                      onChange={(e) => {
                        setAwayJerseyColor(e.target.value);
                        setAwayColorTouched(true);
                      }}
                      className="w-16 h-10 cursor-pointer"
                      data-testid="away-jersey-color-input"
                      aria-label="Away jersey color"
                    />
                    <Input
                      type="text"
                      value={awayJerseyColor}
                      onChange={(e) => {
                        setAwayJerseyColor(e.target.value);
                        setAwayColorTouched(true);
                      }}
                      placeholder="#FFFFFF"
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

                {/* Anonymous score editing (sub-permission) */}
                {allowViewerScoreEdit && (
                  <div className="flex items-center justify-between ml-4">
                    <div>
                      <label htmlFor="allow-anonymous-score-edit" className="text-sm font-medium">
                        Allow Anonymous Score Editing
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Anyone can edit scores without registering
                      </p>
                    </div>
                    <input
                      id="allow-anonymous-score-edit"
                      name="allow-anonymous-score-edit"
                      type="checkbox"
                      checked={allowAnonymousScoreEdit}
                      onChange={(e) => setAllowAnonymousScoreEdit(e.target.checked)}
                      className="w-5 h-5"
                      data-testid="allow-anonymous-score-edit-checkbox"
                      aria-label="Allow anonymous score editing"
                    />
                  </div>
                )}
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
              ref={(el) => {
                if (el) {
                  console.error('[AdminPanel] 🔴 RED ERROR DISPLAYED:', {
                    type: 'save',
                    message: saveError,
                    timestamp: new Date().toISOString()
                  });
                }
              }}
            >
              {saveError}
            </div>
          )}

          {saveSuccess && (
            <div 
              className="text-sm text-success bg-success/10 border border-success/30 px-3 py-2 rounded"
              data-testid="save-success-message"
              ref={(el) => {
                if (el) {
                  console.log('[AdminPanel] ✅ GREEN SUCCESS DISPLAYED:', {
                    timestamp: new Date().toISOString()
                  });
                }
              }}
            >
              Settings saved successfully! Refreshing...
            </div>
          )}

          <Button
            onClick={() => {
              console.log('[AdminPanel] 🖱️  Save Settings button clicked', {
                hasToken: !!adminToken,
                isSaving,
                streamUrl: streamUrl || null,
                chatEnabled,
                scoreboardEnabled
              });
              handleSave();
            }}
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
    {toastError && (
      <ErrorToast
        message={toastError}
        onDismiss={() => setToastError(null)}
        data-testid="error-toast-admin-unlock"
      />
    )}
    </>
  );
}
