/**
 * ClipViewer Component
 * 
 * Video player for viewing clips with tracking
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useTrackClipView, useTrackClipShare, type VideoClip } from '@/lib/hooks/useDVR';

interface ClipViewerProps {
  clip: VideoClip;
  autoplay?: boolean;
  onClose?: () => void;
  className?: string;
}

export function ClipViewer({
  clip,
  autoplay = false,
  onClose,
  className = '',
}: ClipViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [copied, setCopied] = useState(false);
  const { trackView } = useTrackClipView();
  const { trackShare } = useTrackClipShare();

  useEffect(() => {
    // Track view when video starts playing
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (!hasTrackedView) {
        trackView(clip.id).catch(console.error);
        setHasTrackedView(true);
      }
    };

    video.addEventListener('play', handlePlay);
    return () => video.removeEventListener('play', handlePlay);
  }, [clip.id, hasTrackedView, trackView]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/clips/${clip.id}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Track share
      await trackShare(clip.id);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div data-testid="clip-viewer" className={`bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Video Player */}
      <div className="relative bg-black aspect-video">
        {clip.playbackUrl ? (
          <video
            ref={videoRef}
            data-testid="video-player"
            src={clip.playbackUrl}
            poster={clip.thumbnailUrl}
            controls
            autoPlay={autoplay}
            className="w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Video not available</p>
          </div>
        )}

        {onClose && (
          <button
            data-testid="btn-close-clip"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            aria-label="Close clip viewer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Clip Info */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-2">{clip.title}</h2>
        
        {clip.description && (
          <p className="text-gray-300 mb-4">{clip.description}</p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
          <div>
            <span className="font-semibold">Duration:</span> {formatDuration(clip.durationSeconds)}
          </div>
          <div>
            <span className="font-semibold">Created:</span> {formatDate(clip.createdAt)}
          </div>
          <div>
            <span className="font-semibold">Views:</span> {clip.viewCount.toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Shares:</span> {clip.shareCount.toLocaleString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            data-testid="btn-share-clip"
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : '📤 Share'}
          </button>

          {clip.isPublic && (
            <span className="px-4 py-2 bg-green-900/50 text-green-300 rounded-lg">
              Public
            </span>
          )}

          <span className={`px-4 py-2 rounded-lg ${
            clip.status === 'ready' 
              ? 'bg-green-900/50 text-green-300' 
              : 'bg-yellow-900/50 text-yellow-300'
          }`}>
            {clip.status === 'ready' ? '✓ Ready' : '⏳ Processing'}
          </span>
        </div>
      </div>
    </div>
  );
}

