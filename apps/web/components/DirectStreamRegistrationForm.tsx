/**
 * DirectStream Registration Form Component
 * 
 * Allows viewers to register for stream access + chat.
 */

'use client';

import { useState } from 'react';
import { apiRequest, ApiError } from '../lib/api-client';

interface DirectStreamRegistrationFormProps {
  streamSlug: string;
  streamTitle: string;
  onSuccess: () => void;
}

export default function DirectStreamRegistrationForm({
  streamSlug,
  streamTitle,
  onSuccess,
}: DirectStreamRegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [wantsReminders, setWantsReminders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiRequest<{ message: string; status: string }>(
        `/public/direct/${streamSlug}/register`,
        {
          method: 'POST',
          body: JSON.stringify({ email, firstName, lastName, wantsReminders }),
        }
      );

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className="bg-green-50 border border-green-300 rounded-lg p-6 text-center"
        data-testid="success-registration"
      >
        <div className="text-5xl mb-4">📧</div>
        <h3 className="text-xl font-bold text-green-900 mb-2">Check Your Email!</h3>
        <p className="text-green-800 mb-2">
          We sent a verification link to <strong>{email}</strong>
        </p>
        <p className="text-sm text-green-700">
          Click the link in the email to unlock stream access and chat.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/10 backdrop-blur-lg border border-white/30 rounded-lg p-6"
      data-testid="form-register-stream"
    >
      <h3 className="text-2xl font-bold text-white mb-2">Register for {streamTitle}</h3>
      <p className="text-blue-100 mb-6">
        Unlock stream access and chat by verifying your email
      </p>

      {error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          data-testid="error-registration"
        >
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
            data-testid="input-email"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-white mb-1">
              First Name *
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First"
              data-testid="input-firstName"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-white mb-1">
              Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              maxLength={50}
              className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last"
              data-testid="input-lastName"
            />
          </div>
        </div>

        <div className="flex items-start">
          <input
            id="wantsReminders"
            type="checkbox"
            checked={wantsReminders}
            onChange={(e) => setWantsReminders(e.target.checked)}
            className="mt-1 mr-3 h-4 w-4"
            data-testid="checkbox-reminders"
          />
          <label htmlFor="wantsReminders" className="text-sm text-blue-100">
            Send me email reminders before the stream starts
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
          data-testid="btn-register"
        >
          {loading ? 'Registering...' : 'Register & Verify Email'}
        </button>

        <p className="text-xs text-blue-100 text-center">
          By registering, you'll receive a verification email. You must verify your email to access
          the stream and chat.
        </p>
      </div>
    </form>
  );
}

