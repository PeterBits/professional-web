import type { APIRoute } from 'astro';

interface CalendarEvent {
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

interface CalendarResponse {
  items?: CalendarEvent[];
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const now = new Date();
  const year = parseInt(url.searchParams.get('year') || String(now.getFullYear()));
  const month = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1));

  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;
  const apiKey = import.meta.env.GOOGLE_API_KEY;

  if (!calendarId || !apiKey) {
    return new Response(
      JSON.stringify({ year, month, reserved: [], fallback: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  }

  try {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const gcalUrl =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?key=${apiKey}` +
      `&timeMin=${startDate}` +
      `&timeMax=${endDate}` +
      `&singleEvents=true&orderBy=startTime&maxResults=250`;

    const gcalResponse = await fetch(gcalUrl);
    if (!gcalResponse.ok) {
      return new Response(
        JSON.stringify({ year, month, reserved: [], fallback: true }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
          },
        }
      );
    }

    const gcalData: CalendarResponse = await gcalResponse.json();
    const reserved: string[] = [];
    for (const event of gcalData.items || []) {
      const start = new Date(event.start.date || event.start.dateTime || '');
      const end = new Date(event.end.date || event.end.dateTime || '');
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      const cursor = new Date(start);
      while (cursor < end) {
        reserved.push(formatDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return new Response(
      JSON.stringify({ year, month, reserved }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ year, month, reserved: [], fallback: true }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  }
};
