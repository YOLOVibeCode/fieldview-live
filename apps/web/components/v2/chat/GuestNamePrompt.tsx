'use client';

import { useState, useEffect, FormEvent } from 'react';
import { InlineError } from '../InlineError';

export interface GuestNamePromptProps {
  slug: string;
  onSubmit: (name: string) => void;
  'data-testid'?: string;
}

export function GuestNamePrompt({ slug, onSubmit, 'data-testid': dataTestId }: GuestNamePromptProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from localStorage
  useEffect(() => {
    const cached = localStorage.getItem(`fieldview_guest_name_${slug}`);
    if (cached) {
      setName(cached);
    }
  }, [slug]);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Name is required';
    }
    if (trimmed.length > 30) {
      return 'Name must be 30 characters or less';
    }
    return null;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const validationError = validate(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedName = name.trim();
    
    // Save to localStorage
    localStorage.setItem(`fieldview_guest_name_${slug}`, trimmedName);
    
    // Call parent handler
    onSubmit(trimmedName);
  };

  const handleChange = (value: string) => {
    setName(value);
    // Clear error when user types
    if (error) {
      setError(null);
    }
  };

  const inputId = `guest-name-input-${slug}`;

  return (
    <div
      className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      <form data-testid={dataTestId || 'form-guest-name'} onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            What should we call you?
          </label>
          
          <input
            id={inputId}
            data-testid="input-guest-name"
            type="text"
            value={name}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-describedby={error ? 'error-guest-name' : undefined}
            autoFocus
          />

          {error && (
            <div className="mt-2">
              <InlineError message={error} data-testid="error-guest-name" />
            </div>
          )}
        </div>

        <button
          type="submit"
          data-testid="btn-join-chat"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Join Chat
        </button>
      </form>
    </div>
  );
}
