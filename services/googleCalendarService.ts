
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

/** Evento da agenda primária já normalizado (leitura na UI). */
export interface GoogleExternalEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

function parseDateOnly(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d);
}

/** Converte item da API Calendar v3; retorna null se não houver início válido. */
export function parseGoogleCalendarListItem(raw: {
  id?: string;
  summary?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
}): GoogleExternalEvent | null {
  const id = raw.id;
  if (!id) return null;

  const summary = (raw.summary || '(Sem título)').trim();

  if (raw.start?.dateTime) {
    const start = new Date(raw.start.dateTime);
    const end = raw.end?.dateTime ? new Date(raw.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000);
    if (Number.isNaN(start.getTime())) return null;
    return { id, summary, start, end, allDay: false };
  }

  if (raw.start?.date) {
    const start = parseDateOnly(raw.start.date);
    let end: Date;
    if (raw.end?.date) {
      const endExclusive = parseDateOnly(raw.end.date);
      end = new Date(endExclusive.getTime() - 1);
    } else {
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    }
    return { id, summary, start, end, allDay: true };
  }

  return null;
}

function shouldSkipExternalEvent(ev: GoogleExternalEvent, skipEventIds: Set<string>): boolean {
  if (skipEventIds.has(ev.id)) return true;
  if (/\[SanFran\]/i.test(ev.summary)) return true;
  return false;
}

export function parseExternalEventsFromListResponse(
  data: { items?: unknown[] } | null | undefined,
  skipEventIds: Set<string>
): GoogleExternalEvent[] {
  if (!data?.items?.length) return [];
  const out: GoogleExternalEvent[] = [];
  for (const item of data.items) {
    const ev = parseGoogleCalendarListItem(item as Parameters<typeof parseGoogleCalendarListItem>[0]);
    if (!ev || shouldSkipExternalEvent(ev, skipEventIds)) continue;
    out.push(ev);
  }
  return out;
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

  /**
   * Lista eventos do calendário primário. Recomenda-se sempre passar timeMin/timeMax (RFC3339)
   * para `singleEvents` + `orderBy=startTime` funcionarem de forma previsível.
   */
  async listEvents(options?: { timeMin?: string; timeMax?: string; maxResults?: number }) {
    const token = await this.getAccessToken();
    if (!token) return null;

    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: String(Math.min(250, options?.maxResults ?? 250)),
    });
    if (options?.timeMin) params.set('timeMin', options.timeMin);
    if (options?.timeMax) params.set('timeMax', options.timeMax);

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem('fb_google_token');
        firebaseGoogleToken = null;
        return null;
      }

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  /** Eventos externos (exclui espelhos SanFran e ids já ligados a tarefas). `null` = sem token; `[]` = sem dados ou erro de API. */
  async fetchExternalEventsInRange(
    timeMin: Date,
    timeMax: Date,
    skipEventIds: Set<string>
  ): Promise<GoogleExternalEvent[] | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    const raw = await this.listEvents({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    if (!raw) return [];
    return parseExternalEventsFromListResponse(raw, skipEventIds);
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
