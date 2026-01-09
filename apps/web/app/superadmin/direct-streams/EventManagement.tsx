/**
 * Event Management Component
 * 
 * Nested table for managing DirectStreamEvents under a parent DirectStream
 */

'use client';

import { useState, useEffect } from 'react';
import { apiRequest } from '../../../lib/api-client';

interface DirectStreamEvent {
  id: string;
  eventSlug: string;
  title: string;
  scheduledStartAt: string | null;
  status: string;
  streamUrl: string | null;
  chatEnabled: boolean | null;
  scoreboardEnabled: boolean | null;
  paywallEnabled: boolean | null;
  priceInCents: number | null;
  listed: boolean | null;
  registrationsCount?: number;
  createdAt: string;
}

interface EventManagementProps {
  parentStreamId: string;
  parentSlug: string;
}

export function EventManagement({ parentStreamId, parentSlug }: EventManagementProps) {
  const [events, setEvents] = useState<DirectStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    eventSlug: '',
    title: '',
    scheduledStartAt: '',
    streamUrl: '',
    listed: true,
  });

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{ events: DirectStreamEvent[] }>(
        `/api/admin/direct-streams/${parentStreamId}/events?status=active`,
        { method: 'GET' }
      );
      setEvents(response.events);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [parentStreamId]);

  // Create event
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enforce lowercase eventSlug
    const lowercaseEventSlug = newEvent.eventSlug.toLowerCase();
    
    try {
      await apiRequest(
        `/api/admin/direct-streams/${parentStreamId}/events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newEvent,
            eventSlug: lowercaseEventSlug,
            scheduledStartAt: newEvent.scheduledStartAt ? new Date(newEvent.scheduledStartAt).toISOString() : null,
            streamUrl: newEvent.streamUrl || null,
          }),
        }
      );
      
      // Reset form and refresh
      setNewEvent({ eventSlug: '', title: '', scheduledStartAt: '', streamUrl: '', listed: true });
      setShowCreateForm(false);
      await fetchEvents();
    } catch (error: any) {
      alert(`Failed to create event: ${error.message}`);
    }
  };

  // Archive event
  const handleArchive = async (eventId: string) => {
    if (!confirm('Archive this event?')) return;
    
    try {
      await apiRequest(
        `/api/admin/direct-streams/${parentStreamId}/events/${eventId}/archive`,
        { method: 'POST' }
      );
      await fetchEvents();
    } catch (error: any) {
      alert(`Failed to archive event: ${error.message}`);
    }
  };

  // Delete event
  const handleDelete = async (eventId: string, hard = false) => {
    const confirmMsg = hard 
      ? 'PERMANENTLY DELETE this event? This cannot be undone!'
      : 'Delete this event?';
    
    if (!confirm(confirmMsg)) return;
    
    try {
      await apiRequest(
        `/api/admin/direct-streams/${parentStreamId}/events/${eventId}?hard=${hard}`,
        { method: 'DELETE' }
      );
      await fetchEvents();
    } catch (error: any) {
      alert(`Failed to delete event: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground" data-testid={`loading-events-${parentSlug}`}>
        Loading events...
      </div>
    );
  }

  return (
    <div className="bg-secondary/30 p-4 rounded-lg border-l-4 border-primary" data-testid={`events-section-${parentSlug}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Sub-Events ({events.length})
        </h3>
        <button
          className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90"
          onClick={() => setShowCreateForm(!showCreateForm)}
          data-testid={`btn-toggle-create-event-${parentSlug}`}
        >
          {showCreateForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mb-4 p-4 bg-card rounded border border-border" data-testid={`form-create-event-${parentSlug}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Event Slug*</label>
              <input
                type="text"
                value={newEvent.eventSlug}
                onChange={(e) => setNewEvent({ ...newEvent, eventSlug: e.target.value })}
                placeholder="soccer-20260109-varsity"
                className="w-full px-3 py-2 border border-border rounded bg-input text-foreground"
                required
                pattern="[a-z0-9-]+"
                title="Lowercase alphanumeric with hyphens"
                data-testid="input-event-slug"
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase, alphanumeric, hyphens only</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Title*</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Varsity Soccer - Jan 9, 2026"
                className="w-full px-3 py-2 border border-border rounded bg-input text-foreground"
                required
                data-testid="input-event-title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Start</label>
              <input
                type="datetime-local"
                value={newEvent.scheduledStartAt}
                onChange={(e) => setNewEvent({ ...newEvent, scheduledStartAt: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded bg-input text-foreground"
                data-testid="input-event-scheduled"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Stream URL (optional)</label>
              <input
                type="url"
                value={newEvent.streamUrl}
                onChange={(e) => setNewEvent({ ...newEvent, streamUrl: e.target.value })}
                placeholder="Inherits from parent if empty"
                className="w-full px-3 py-2 border border-border rounded bg-input text-foreground"
                data-testid="input-event-stream-url"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newEvent.listed}
                onChange={(e) => setNewEvent({ ...newEvent, listed: e.target.checked })}
                data-testid="checkbox-event-listed"
              />
              <span className="text-sm">Publicly Listed</span>
            </label>
            
            <button
              type="submit"
              className="ml-auto bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
              data-testid="btn-submit-event"
            >
              Create Event
            </button>
          </div>
        </form>
      )}

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center text-muted-foreground py-8" data-testid={`empty-events-${parentSlug}`}>
          No events yet. Create one to get started!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid={`table-events-${parentSlug}`}>
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left">Event Slug</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Scheduled</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-secondary/20" data-testid={`row-event-${event.eventSlug}`}>
                  <td className="px-3 py-2">
                    <a
                      href={`/direct/${parentSlug}/${event.eventSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-xs"
                      data-testid={`link-event-${event.eventSlug}`}
                    >
                      {event.eventSlug}
                    </a>
                  </td>
                  <td className="px-3 py-2 font-medium">{event.title}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.scheduledStartAt 
                      ? new Date(event.scheduledStartAt).toLocaleString()
                      : '-'
                    }
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      event.status === 'archived' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleArchive(event.id)}
                        className="text-xs text-yellow-400 hover:underline"
                        data-testid={`btn-archive-event-${event.eventSlug}`}
                      >
                        Archive
                      </button>
                      <button
                        onClick={() => handleDelete(event.id, false)}
                        className="text-xs text-orange-400 hover:underline"
                        data-testid={`btn-delete-event-${event.eventSlug}`}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleDelete(event.id, true)}
                        className="text-xs text-red-400 hover:underline"
                        data-testid={`btn-hard-delete-event-${event.eventSlug}`}
                      >
                        Hard Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

