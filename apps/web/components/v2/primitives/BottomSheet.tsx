/**
 * BottomSheet Component
 * 
 * Mobile-optimized modal that slides up from the bottom
 * Supports snap points, drag-to-dismiss, and backdrop
 * 
 * Usage:
 * ```tsx
 * <BottomSheet 
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   snapPoints={[0.25, 0.5, 0.9]}
 *   initialSnap={1}
 * >
 *   <h2>Title</h2>
 *   <p>Content goes here</p>
 * </BottomSheet>
 * ```
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[];       // [0.25, 0.5, 0.9] = 25%, 50%, 90% of viewport
  initialSnap?: number;         // Index of initial snap point
  enableDrag?: boolean;
  enableBackdrop?: boolean;
  children: React.ReactNode;
  'aria-labelledby'?: string;
}

/**
 * BottomSheet Component
 * 
 * Accessible, touch-optimized bottom sheet with snap points
 */
export function BottomSheet({
  isOpen,
  onClose,
  snapPoints = [0.9],
  initialSnap = 0,
  enableDrag = true,
  enableBackdrop = true,
  children,
  'aria-labelledby': ariaLabelledBy,
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIsAnimating(true);
      
      // Remove animation class after animation completes
      const timer = setTimeout(() => setIsAnimating(false), 300);
      
      return () => {
        document.body.style.overflow = '';
        clearTimeout(timer);
      };
    }
  }, [isOpen]);
  
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableDrag) return;
    
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setDragY(0);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const delta = currentY - startY;
    
    // Only allow dragging down
    if (delta > 0) {
      setDragY(delta);
    }
  };
  
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Close if dragged down past threshold (25% of viewport)
    const threshold = window.innerHeight * 0.25;
    if (dragY > threshold) {
      onClose();
    }
    
    // Reset drag
    setDragY(0);
    setStartY(0);
  };
  
  if (!isOpen) return null;
  
  const snapHeight = snapPoints[currentSnap] * 100;
  const transform = isDragging ? `translateY(${dragY}px)` : 'translateY(0)';
  
  const content = (
    <>
      {/* Backdrop */}
      {enableBackdrop && (
        <div
          data-testid="bottom-sheet-backdrop"
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--fv-z-modal)]"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sheet */}
      <div
        ref={sheetRef}
        data-testid="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={cn(
          'fixed bottom-0 left-0 right-0',
          'bg-[var(--fv-color-bg-primary)]',
          'rounded-t-[var(--fv-radius-xl)]',
          'shadow-[var(--fv-elevation-5)]',
          'z-[calc(var(--fv-z-modal)+1)]',
          'fv-safe-area-bottom',
          'overflow-hidden',
          'flex flex-col',
          isAnimating && (isOpen ? 'fv-sheet-enter' : 'fv-sheet-exit'),
          'animate-slide-up'
        )}
        style={{
          height: `${snapHeight}vh`,
          transform,
          transition: isDragging ? 'none' : 'transform var(--fv-duration-normal) var(--fv-ease-out)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        {enableDrag && (
          <div
            data-testid="bottom-sheet-handle"
            className="flex items-center justify-center pt-3 pb-2"
            aria-label="Drag to resize or dismiss"
          >
            <div className="w-12 h-1 bg-[var(--fv-color-text-muted)] rounded-full opacity-50" />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
  
  // Render in portal for proper z-index stacking
  return typeof window !== 'undefined'
    ? createPortal(content, document.body)
    : null;
}

