
import { supabase } from './supabaseClient';
import { auth } from '../firebase';
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

// Store token in memory or localStorage for the session
let firebaseGoogleToken: string | null = localStorage.getItem('fb_google_token');

export const googleCalendarService = {
  setFirebaseToken(token: string) {
    firebaseGoogleToken = token;
    localStorage.setItem('fb_google_token', token);
  },

  async getAccessToken() {
    // Try Firebase token first (since it's what we'll use for the fix)
    if (firebaseGoogleToken) return firebaseGoogleToken;

    // Fallback to Supabase (original logic)
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[googleCalendarService] Error getting session:', error.message);
        return null;
      }
      if (session?.provider_token) {
        return session.provider_token;
      }
    } catch (e) {
      console.error('[googleCalendarService] Unexpected error in getAccessToken:', e);
    }
    
    console.warn('[googleCalendarService] No provider token found.');
    return null;
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

      if (response.status === 401) {
        localStorage.removeItem('fb_google_token');
        firebaseGoogleToken = null;
        throw new Error('Sessão do Google expirada. Por favor, conecte-se novamente.');
      }

      if (!response.ok) {
        const error = await response.json();
        console.error('[googleCalendarService] Error creating event:', error);
        throw new Error(error.error?.message || 'Erro ao criar evento no Google Agenda');
      }

      return await response.json();
    } catch (err) {
      const isNetworkError = (err instanceof TypeError && err.message === 'Failed to fetch') || (err instanceof Error && err.message.includes('fetch'));
      console.error('[googleCalendarService] Create event fetch error:', err);
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

      if (response.status === 401) {
        localStorage.removeItem('fb_google_token');
        firebaseGoogleToken = null;
        throw new Error('Sessão do Google expirada. Por favor, conecte-se novamente.');
      }

      if (!response.ok) {
        const error = await response.json();
        console.error('[googleCalendarService] Error updating event:', error);
        throw new Error(error.error?.message || 'Erro ao atualizar evento no Google Agenda');
      }

      return await response.json();
    } catch (err) {
      const isNetworkError = (err instanceof TypeError && err.message === 'Failed to fetch') || (err instanceof Error && err.message.includes('fetch'));
      console.error('[googleCalendarService] Update event fetch error:', err);
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
      const isNetworkError = (err instanceof TypeError && err.message === 'Failed to fetch') || (err instanceof Error && err.message.includes('fetch'));
      console.error('[googleCalendarService] Delete event fetch error:', err);
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
