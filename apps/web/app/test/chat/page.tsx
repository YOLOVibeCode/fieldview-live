'use client';

/**
 * E2E Chat Test Page
 * 
 * Minimal page for testing chat functionality without requiring
 * full direct stream or watch link setup.
 */

import { useState, useEffect } from 'react';
import { useGameChat } from '@/hooks/useGameChat';
import { useViewerIdentity } from '@/hooks/useViewerIdentity';
import { GameChatPanel } from '@/components/GameChatPanel';
import { ViewerUnlockForm } from '@/components/ViewerUnlockForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

export default function ChatTestPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load test game
  useEffect(() => {
    async function loadTestGame() {
      try {
        // Try to get or create a test game
        const response = await fetch(`${API_URL}/api/direct/e2e-test/bootstrap`);
        const data = await response.json();
        
        if (data.gameId) {
          setGameId(data.gameId);
        } else {
          setError('No game available for testing. Please create an owner account first.');
        }
      } catch (err) {
        setError(`Failed to load test game: ${err}`);
      } finally {
        setLoading(false);
      }
    }

    loadTestGame();
  }, []);

  const viewer = useViewerIdentity({ gameId });
  const chat = useGameChat({
    gameId,
    viewerToken: viewer.token,
    enabled: viewer.isUnlocked && gameId !== null,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading test environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Test Setup Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Run in terminal: <code className="bg-muted px-2 py-1 rounded">cd apps/api && pnpm db:seed</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-card border rounded-lg p-4">
          <h1 className="text-2xl font-bold" data-testid="page-title">
            Chat E2E Test Page
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Game ID: <code className="bg-muted px-2 py-1 rounded" data-testid="game-id">{gameId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mock video player */}
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center" data-testid="video-player">
            <p className="text-white">Test Video Player</p>
          </div>

          {/* Chat panel */}
          <div data-testid="chat-container">
            {!viewer.isUnlocked ? (
              <ViewerUnlockForm
                onUnlock={viewer.unlock}
                isLoading={viewer.isLoading}
                error={viewer.error}
                title="Unlock to Chat"
                description="Enter your info to test the chat"
              />
            ) : (
              <GameChatPanel chat={chat} className="h-[600px]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

