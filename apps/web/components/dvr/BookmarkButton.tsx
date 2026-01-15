/**
 * BookmarkButton Component
 * 
 * Button to bookmark a specific timestamp in a video stream
 */

'use client';

import { useState } from 'react';
import { useCreateBookmark } from '@/lib/hooks/useDVR';

interface BookmarkButtonProps {
  gameId?: string;
  directStreamId?: string;
  viewerIdentityId: string;
  getCurrentTime: () => number;
  onSuccess?: () => void;
  className?: string;
}

export function BookmarkButton({
  gameId,
  directStreamId,
  viewerIdentityId,
  getCurrentTime,
  onSuccess,
  className = '',
}: BookmarkButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [label, setLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [isShared, setIsShared] = useState(false);
  const { createBookmark, loading, error } = useCreateBookmark();

  const handleBookmark = async () => {
    const timestampSeconds = Math.floor(getCurrentTime());
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!label.trim()) {
      return;
    }

    try {
      await createBookmark({
        gameId,
        directStreamId,
        viewerIdentityId,
        timestampSeconds: Math.floor(getCurrentTime()),
        label: label.trim(),
        notes: notes.trim() || undefined,
        isShared,
      });

      // Reset form
      setLabel('');
      setNotes('');
      setIsShared(false);
      setShowDialog(false);

      onSuccess?.();
    } catch (err) {
      console.error('Failed to create bookmark:', err);
    }
  };

  return (
    <>
      <button
        data-testid="btn-bookmark"
        onClick={handleBookmark}
        className={`px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors ${className}`}
        aria-label="Bookmark current moment"
      >
        <svg
          className="w-5 h-5 inline-block mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        Bookmark
      </button>

      {showDialog && (
        <div
          data-testid="modal-bookmark"
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDialog(false);
            }
          }}
        >
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Create Bookmark</h2>

            <form data-testid="form-bookmark" onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="bookmark-label" className="block text-gray-300 mb-2">
                  Label *
                </label>
                <input
                  id="bookmark-label"
                  data-testid="input-bookmark-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-amber-500 focus:outline-none"
                  placeholder="e.g., Amazing goal"
                  maxLength={200}
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="bookmark-notes" className="block text-gray-300 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  id="bookmark-notes"
                  data-testid="input-bookmark-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-amber-500 focus:outline-none"
                  placeholder="Add details about this moment..."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="mb-6">
                <label className="flex items-center text-gray-300">
                  <input
                    type="checkbox"
                    data-testid="checkbox-bookmark-shared"
                    checked={isShared}
                    onChange={(e) => setIsShared(e.target.checked)}
                    className="mr-2"
                  />
                  Share publicly
                </label>
              </div>

              {error && (
                <div data-testid="error-bookmark" className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  data-testid="btn-cancel-bookmark"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="btn-submit-bookmark"
                  disabled={loading || !label.trim()}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Bookmark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

