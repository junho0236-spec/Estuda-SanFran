
import { supabase } from './supabaseClient';
import { Task } from '../types';

export interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
}

export const googleCalendarService = {
  async getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      console.warn('[googleCalendarService] No provider token found. User might not be signed in with Google or scope not granted.');
      return null;
    }
    return session.provider_token;
  },

  async createEvent(event: GoogleCalendarEvent) {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[googleCalendarService] Error creating event:', error);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('[googleCalendarService] Fetch error:', err);
      return null;
    }
  },

  async updateEvent(eventId: string, event: GoogleCalendarEvent) {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[googleCalendarService] Error updating event:', error);
        return null;
      }

      return await response.json();
    } catch (err) {
      console.error('[googleCalendarService] Fetch error:', err);
      return null;
    }
  },

  async deleteEvent(eventId: string) {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (err) {
      console.error('[googleCalendarService] Fetch error:', err);
      return false;
    }
  },

  async listEvents() {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      return null;
    }
  },

  async syncTaskToGoogle(task: Task, subjectName?: string) {
    if (!task.dueDate) return null;

    const startDateTime = new Date(task.dueDate).toISOString();
    // Default to 1 hour event
    const endDateTime = new Date(new Date(task.dueDate).getTime() + 60 * 60 * 1000).toISOString();

    const event: GoogleCalendarEvent = {
      summary: `${task.completed ? '✅ ' : ''}[SanFran] ${task.title}`,
      description: `Tarefa do SanFran Academy\nDisciplina: ${subjectName || 'Geral'}\nNotas: ${task.notes || ''}\nStatus: ${task.completed ? 'Concluída' : 'Pendente'}`,
      start: {
        dateTime: startDateTime,
      },
      end: {
        dateTime: endDateTime,
      },
    };

    if (task.google_event_id) {
      return await this.updateEvent(task.google_event_id, event);
    } else {
      return await this.createEvent(event);
    }
  }
};
