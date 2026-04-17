import type { APIRoute } from 'astro';

/**
 * Public endpoint: returns per-day availability and pricing for a given month.
 *
 * Rules driven by the events in the configured Google Calendar:
 *   - Event whose title or description contains "reserva" (case-insensitive)
 *     → that day is marked as "reserved".
 *   - Event whose title or description contains "precio" followed by a number
 *     → that day is marked as "available" with that price.
 *   - A day with no matching event is marked as "unavailable".
 *   - If several "precio" events fall on the same day, the highest price wins
 *     (so you can publish a base price for the whole year and override it for
 *     specific seasons with a more expensive event).
 *   - If both a reserva and a precio event fall on the same day, "reserved"
 *     wins (conservative).
 */

type DayStatus = 'reserved' | 'available' | 'unavailable';

interface DayInfo {
  date: string;
  status: DayStatus;
  price?: number;
}

interface AvailabilityResponse {
  year: number;
  month: number;
  days: DayInfo[];
  fallback?: boolean;
}

interface CalendarEvent {
  summary?: string | null;
  description?: string | null;
  start?: { date?: string | null; dateTime?: string | null };
  end?: { date?: string | null; dateTime?: string | null };
}

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const RESERVA_REGEX = /reserva/i;
const PRICE_REGEX = /precio[\s:]*([0-9]+(?:[.,][0-9]+)?)/i;
const MAX_EVENTS_PER_MONTH = 250;

/**
 * Formats a (year, month, day) triplet as an ISO date string (YYYY-MM-DD).
 * @param year - 4-digit year
 * @param month - 1-indexed month (1 = January)
 * @param day - 1-indexed day of the month
 * @returns ISO date string
 */
function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Extracts a price from a piece of text matching "precio <number>".
 * Accepts integers and decimals with dot or comma separator.
 * @param text - Raw text from an event's summary or description
 * @returns Parsed price or null if no match
 */
function parsePriceFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const match = text.match(PRICE_REGEX);
  if (!match) return null;
  const parsed = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Checks whether the event's text mentions "reserva" (case-insensitive).
 * @param summary - Event title
 * @param description - Event description
 * @returns true if either field mentions "reserva"
 */
function eventMentionsReserva(
  summary?: string | null,
  description?: string | null,
): boolean {
  return RESERVA_REGEX.test(summary ?? '') || RESERVA_REGEX.test(description ?? '');
}

/**
 * Expands a calendar event into every UTC date string it spans.
 * Handles both all-day events (where `end.date` is exclusive) and
 * timed events (where `end.dateTime` is inclusive of its own day).
 * @param event - Google Calendar event object
 * @returns Array of ISO date strings covered by the event
 */
function expandEventDays(event: CalendarEvent): string[] {
  if (event.start?.date && event.end?.date) {
    return expandAllDayEvent(event.start.date, event.end.date);
  }

  const startRaw = event.start?.dateTime ?? event.start?.date;
  const endRaw = event.end?.dateTime ?? event.end?.date;
  if (!startRaw || !endRaw) return [];

  return expandTimedEvent(startRaw, endRaw);
}

function expandAllDayEvent(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cur = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cur < end) {
    days.push(
      formatDateKey(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()),
    );
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function expandTimedEvent(startRaw: string, endRaw: string): string[] {
  const start = new Date(startRaw);
  const end = new Date(endRaw);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const days: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= endDay) {
    days.push(
      formatDateKey(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate()),
    );
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

/**
 * Fallback response when credentials are missing or Google fails:
 * marks every day of the month as unavailable.
 * @param year - 4-digit year
 * @param month - 1-indexed month
 * @returns Availability response with all days set to "unavailable"
 */
function buildFallbackResponse(year: number, month: number): AvailabilityResponse {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: formatDateKey(year, month, d), status: 'unavailable' });
  }
  return { year, month, days, fallback: true };
}

/**
 * Groups events into reserved days and priced days.
 * Reserved takes precedence over priced. When several "precio" events cover
 * the same day, the highest price wins.
 * @param events - Raw events returned by Google Calendar
 * @returns Two structures indexed by date: a Set of reserved days and a Map of prices
 */
function indexEvents(events: CalendarEvent[]): {
  reservedDays: Set<string>;
  priceByDay: Map<string, number>;
} {
  const reservedDays = new Set<string>();
  const priceByDay = new Map<string, number>();

  for (const event of events) {
    const days = expandEventDays(event);
    if (days.length === 0) continue;

    const isReserva = eventMentionsReserva(event.summary, event.description);
    const price = parsePriceFromText(event.summary) ?? parsePriceFromText(event.description);

    for (const day of days) {
      if (isReserva) {
        reservedDays.add(day);
        continue;
      }
      if (price === null) continue;
      const current = priceByDay.get(day);
      if (current === undefined || price > current) {
        priceByDay.set(day, price);
      }
    }
  }

  return { reservedDays, priceByDay };
}

/**
 * Builds the final per-day array combining the reserved set and price map.
 * @param year - 4-digit year
 * @param month - 1-indexed month
 * @param reservedDays - Days flagged as reserved
 * @param priceByDay - Days that have an explicit price
 * @returns Ordered list of days with their resolved status
 */
function buildDays(
  year: number,
  month: number,
  reservedDays: Set<string>,
  priceByDay: Map<string, number>,
): DayInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: DayInfo[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d);
    if (reservedDays.has(dateKey)) {
      days.push({ date: dateKey, status: 'reserved' });
      continue;
    }
    const price = priceByDay.get(dateKey);
    if (price !== undefined) {
      days.push({ date: dateKey, status: 'available', price });
      continue;
    }
    days.push({ date: dateKey, status: 'unavailable' });
  }

  return days;
}

/**
 * GET /api/availability?year=YYYY&month=MM
 *
 * Returns the month's per-day availability derived from the shared
 * Google Calendar.
 * @returns JSON response with an AvailabilityResponse body
 */
export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()), 10);
  const month = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1), 10);

  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;
  const serviceAccountEmail = import.meta.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = import.meta.env.GOOGLE_PRIVATE_KEY;

  if (!calendarId || !serviceAccountEmail || !privateKey) {
    return jsonResponse(buildFallbackResponse(year, month));
  }

  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: [CALENDAR_SCOPE],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = new Date(Date.UTC(year, month - 1, 1)).toISOString();
    const timeMax = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString();

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: MAX_EVENTS_PER_MONTH,
    });

    const events = (response.data.items ?? []) as CalendarEvent[];
    const { reservedDays, priceByDay } = indexEvents(events);
    const days = buildDays(year, month, reservedDays, priceByDay);

    return jsonResponse({ year, month, days });
  } catch (err) {
    console.error(
      'availability endpoint — Google Calendar failure:',
      err instanceof Error ? err.message : err,
    );
    return jsonResponse(buildFallbackResponse(year, month));
  }
};

function jsonResponse(body: AvailabilityResponse): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
