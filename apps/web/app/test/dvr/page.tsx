/**
 * DVR Test Page
 * 
 * Test page for DVR components (bookmarks, clips)
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { BookmarkButton } from '@/components/dvr/BookmarkButton';
import { BookmarksList } from '@/components/dvr/BookmarksList';

function DVRTestPageContent() {
  const searchParams = useSearchParams();
  const gameId = searchParams.get('gameId') || undefined;
  const directStreamId = searchParams.get('directStreamId') || undefined;
  const viewerId = searchParams.get('viewerId') || '';
  
  const [currentTime, setCurrentTime] = useState(120); // Mock current time at 2:00
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Simulate video time progression
    const interval = setInterval(() => {
      setCurrentTime((t) => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSeek = (timeSeconds: number) => {
    setCurrentTime(timeSeconds);
    alert(`Seeking to ${timeSeconds} seconds`);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!viewerId) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">DVR Test Page</h1>
          <p className="text-gray-300 mb-4">
            Please provide viewerId as a query parameter:
          </p>
          <code className="block bg-gray-800 text-amber-400 p-3 rounded text-sm">
            /test/dvr?viewerId=YOUR_VIEWER_ID&gameId=YOUR_GAME_ID
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">DVR Test Page</h1>

        {/* Mock Video Player */}
        <div className="bg-black aspect-video rounded-lg mb-6 flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-6xl font-mono text-white mb-4">
              {formatTime(currentTime)}
            </div>
            <p className="text-gray-400">Mock Video Player</p>
          </div>

          {/* Bookmark Button Overlay */}
          <div className="absolute bottom-4 right-4">
            <BookmarkButton
              gameId={gameId}
              directStreamId={directStreamId}
              viewerIdentityId={viewerId}
              getCurrentTime={() => currentTime}
              onSuccess={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </div>

        {/* Test Info */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-bold text-white mb-3">Test Configuration</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Viewer ID:</span>
              <p className="text-white font-mono">{viewerId}</p>
            </div>
            {gameId && (
              <div>
                <span className="text-gray-400">Game ID:</span>
                <p className="text-white font-mono">{gameId}</p>
              </div>
            )}
            {directStreamId && (
              <div>
                <span className="text-gray-400">Stream ID:</span>
                <p className="text-white font-mono">{directStreamId}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400">Current Time:</span>
              <p className="text-white font-mono">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>

        {/* Bookmarks List */}
        <div key={refreshKey} className="bg-gray-900 rounded-lg">
          <BookmarksList
            viewerId={viewerId}
            gameId={gameId}
            directStreamId={directStreamId}
            onSeek={handleSeek}
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-300 mb-2">Test Instructions</h3>
          <ul className="text-blue-200 text-sm space-y-1">
            <li>• Click "Bookmark" to create a bookmark at the current time</li>
            <li>• Created bookmarks will appear in the list below</li>
            <li>• Click "Jump to" to seek to a bookmark's timestamp</li>
            <li>• Click "Create Clip" to generate a clip from a bookmark</li>
            <li>• Click "Delete" to remove a bookmark</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function DVRTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading DVR Test...</div>}>
      <DVRTestPageContent />
    </Suspense>
  );
}

