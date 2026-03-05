'use client';

/**
 * GoLiveButton – floating pill "LIVE" button for DVR; seeks to live edge when clicked.
 */

export interface GoLiveButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function GoLiveButton({ visible, onClick }: GoLiveButtonProps) {
  if (!visible) return null;
  return (
    <button
      type="button"
      data-testid="btn-go-live"
      onClick={onClick}
      aria-label="Go to live"
      className="absolute bottom-14 right-4 z-10 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-2 text-sm font-medium text-white hover:bg-black/85"
    >
      <span
        data-testid="go-live-dot"
        className="h-2 w-2 rounded-full bg-red-500"
        aria-hidden
      />
      LIVE
    </button>
  );
}
