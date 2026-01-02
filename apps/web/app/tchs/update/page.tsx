'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const STREAM_KEY = 'tchs-stream-url';
const ADMIN_PASSWORD = 'tchs2026'; // Simple password protection

export default function TchsUpdatePage() {
  const router = useRouter();
  const [streamUrl, setStreamUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if already authenticated in this session
    const auth = sessionStorage.getItem('tchs-admin-auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadCurrentUrl();
    }
  }, []);

  function loadCurrentUrl() {
    const saved = localStorage.getItem(STREAM_KEY);
    setCurrentUrl(saved);
    setStreamUrl(saved || '');
  }

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('tchs-admin-auth', 'true');
      loadCurrentUrl();
      setMessage('');
    } else {
      setMessage('Incorrect password');
    }
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    if (!streamUrl.trim()) {
      setMessage('Please enter a stream URL');
      return;
    }

    // Validate URL format
    try {
      new URL(streamUrl);
    } catch {
      setMessage('Invalid URL format');
      return;
    }

    // Save to localStorage
    localStorage.setItem(STREAM_KEY, streamUrl.trim());
    setCurrentUrl(streamUrl.trim());
    setMessage('✓ Stream URL updated successfully! Viewers will see the new stream.');
  }

  function handleClear() {
    localStorage.removeItem(STREAM_KEY);
    setStreamUrl('');
    setCurrentUrl(null);
    setMessage('Stream URL cleared. Viewers will see "Stream Offline".');
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center">TCHS Stream Admin</h1>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                data-testid="input-admin-password"
                autoFocus
              />
            </div>
            {message && (
              <p className="text-sm text-red-600" data-testid="error-auth">
                {message}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              data-testid="btn-auth"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-2">TCHS Stream Admin</h1>
          <p className="text-sm text-gray-600 mb-6">
            Update the stream URL for <strong>fieldview.live/tchs/</strong>
          </p>

          {/* Current Status */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium mb-1">Current Status:</p>
            {currentUrl ? (
              <div className="space-y-1">
                <p className="text-sm text-green-600 font-medium">✓ Stream Active</p>
                <p className="text-xs text-gray-600 break-all">{currentUrl}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No stream URL set (viewers see "Stream Offline")</p>
            )}
          </div>

          {/* Update Form */}
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label htmlFor="streamUrl" className="block text-sm font-medium mb-1">
                Stream URL (.m3u8)
              </label>
              <input
                id="streamUrl"
                type="url"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="https://stream.mux.com/PLAYBACK_ID.m3u8"
                className="w-full px-3 py-2 border rounded-md"
                data-testid="input-stream-url"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paste your Mux playback URL or any HLS (.m3u8) URL
              </p>
            </div>

            {message && (
              <p
                className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}
                data-testid="message-update"
              >
                {message}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                data-testid="btn-update-stream"
              >
                Update Stream
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                data-testid="btn-clear-stream"
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t">
            <h2 className="font-medium mb-2">Instructions:</h2>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Copy your Mux playback URL (ends in .m3u8)</li>
              <li>Paste it above and click "Update Stream"</li>
              <li>Share <strong>fieldview.live/tchs/</strong> with parents</li>
              <li>The link stays the same—you can update the stream anytime</li>
            </ol>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.open('/tchs/', '_blank')}
              className="text-sm text-blue-600 hover:underline"
              data-testid="btn-preview"
            >
              Preview viewer page →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

