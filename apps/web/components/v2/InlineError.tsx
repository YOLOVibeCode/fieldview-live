import { AlertCircle } from 'lucide-react';

export interface InlineErrorProps {
  message: string;
  'data-testid'?: string;
}

export function InlineError({ message, 'data-testid': dataTestId }: InlineErrorProps) {
  return (
    <div
      role="alert"
      data-testid={dataTestId}
      className="flex items-center gap-1 text-sm text-red-600"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
