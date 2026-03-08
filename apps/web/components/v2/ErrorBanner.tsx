import { AlertCircle, X } from 'lucide-react';

export interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  'data-testid'?: string;
}

export function ErrorBanner({ message, onDismiss, onRetry, 'data-testid': dataTestId }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      data-testid={dataTestId}
      className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3"
    >
      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-600 font-medium">{message}</p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800 underline"
            aria-label="Retry"
          >
            Retry
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
