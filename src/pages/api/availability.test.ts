import { describe, it, expect } from 'vitest';
import {
  parsePriceFromText,
  eventMentionsReserva,
  formatDateKey,
  expandAllDayEvent,
  expandTimedEvent,
  indexEvents,
  buildDays,
  buildFallbackResponse,
} from './availability';

describe('parsePriceFromText', () => {
  describe('when input is null or undefined', () => {
    it('should return null', () => {
      expect(parsePriceFromText(null)).toBeNull();
      expect(parsePriceFromText(undefined)).toBeNull();
    });
  });

  describe('when input is empty string', () => {
    it('should return null', () => {
      expect(parsePriceFromText('')).toBeNull();
    });
  });

  describe('when text contains "precio" followed by integer', () => {
    it('should parse and return the integer', () => {
      expect(parsePriceFromText('precio 100')).toBe(100);
      expect(parsePriceFromText('Precio 50')).toBe(50);
      expect(parsePriceFromText('PRECIO 75')).toBe(75);
    });
  });

  describe('when text contains "precio" followed by decimal with dot', () => {
    it('should parse and return the decimal', () => {
      expect(parsePriceFromText('precio 100.50')).toBe(100.5);
      expect(parsePriceFromText('precio 99.99')).toBe(99.99);
    });
  });

  describe('when text contains "precio" followed by decimal with comma', () => {
    it('should convert comma to dot and return the decimal', () => {
      expect(parsePriceFromText('precio 100,50')).toBe(100.5);
      expect(parsePriceFromText('precio 99,99')).toBe(99.99);
    });
  });

  describe('when text has no "precio" keyword', () => {
    it('should return null', () => {
      expect(parsePriceFromText('available for 100 euros')).toBeNull();
      expect(parsePriceFromText('price is 50')).toBeNull();
    });
  });

  describe('when "precio" is present but no number follows', () => {
    it('should return null', () => {
      expect(parsePriceFromText('precio sin número')).toBeNull();
      expect(parsePriceFromText('precio')).toBeNull();
    });
  });

  describe('when "precio" is followed by invalid number', () => {
    it('should return null', () => {
      expect(parsePriceFromText('precio abc')).toBeNull();
    });
  });
});

describe('eventMentionsReserva', () => {
  describe('when summary is null', () => {
    it('should check description', () => {
      expect(eventMentionsReserva(null, 'reserva')).toBe(true);
      expect(eventMentionsReserva(null, 'no match')).toBe(false);
    });
  });

  describe('when description is null', () => {
    it('should check summary', () => {
      expect(eventMentionsReserva('reserva', null)).toBe(true);
      expect(eventMentionsReserva('no match', null)).toBe(false);
    });
  });

  describe('when both summary and description are null', () => {
    it('should return false', () => {
      expect(eventMentionsReserva(null, null)).toBe(false);
    });
  });

  describe('when "reserva" is in summary (case-insensitive)', () => {
    it('should return true', () => {
      expect(eventMentionsReserva('Reserva', '')).toBe(true);
      expect(eventMentionsReserva('RESERVA', '')).toBe(true);
      expect(eventMentionsReserva('ReSeRvA', '')).toBe(true);
      expect(eventMentionsReserva('This is a reserva', '')).toBe(true);
    });
  });

  describe('when "reserva" is in description (case-insensitive)', () => {
    it('should return true', () => {
      expect(eventMentionsReserva('', 'Reserva')).toBe(true);
      expect(eventMentionsReserva('', 'RESERVA')).toBe(true);
      expect(eventMentionsReserva('', 'This is a reserva')).toBe(true);
    });
  });

  describe('when "reserva" is not in either field', () => {
    it('should return false', () => {
      expect(eventMentionsReserva('Available', 'Open slot')).toBe(false);
      expect(eventMentionsReserva('Booked', 'Not available')).toBe(false);
    });
  });
});

describe('formatDateKey', () => {
  describe('with single-digit month and day', () => {
    it('should pad with leading zeros', () => {
      expect(formatDateKey(2026, 1, 5)).toBe('2026-01-05');
      expect(formatDateKey(2026, 3, 7)).toBe('2026-03-07');
    });
  });

  describe('with double-digit month and day', () => {
    it('should return YYYY-MM-DD format', () => {
      expect(formatDateKey(2026, 12, 31)).toBe('2026-12-31');
      expect(formatDateKey(2026, 10, 25)).toBe('2026-10-25');
    });
  });

  describe('with edge dates', () => {
    it('should handle year boundaries', () => {
      expect(formatDateKey(1999, 1, 1)).toBe('1999-01-01');
      expect(formatDateKey(2100, 12, 31)).toBe('2100-12-31');
    });
  });
});

describe('expandAllDayEvent', () => {
  describe('with single-day all-day event', () => {
    it('should return array with one date', () => {
      expect(expandAllDayEvent('2026-04-20', '2026-04-21')).toEqual(['2026-04-20']);
    });
  });

  describe('with multi-day all-day event', () => {
    it('should return array of all dates (end exclusive)', () => {
      expect(expandAllDayEvent('2026-04-20', '2026-04-23')).toEqual([
        '2026-04-20',
        '2026-04-21',
        '2026-04-22',
      ]);
    });
  });

  describe('crossing month boundary', () => {
    it('should handle dates spanning two months', () => {
      const result = expandAllDayEvent('2026-04-30', '2026-05-02');
      expect(result).toContain('2026-04-30');
      expect(result).toContain('2026-05-01');
      expect(result.length).toBe(2);
    });
  });
});

describe('expandTimedEvent', () => {
  describe('with single-day timed event', () => {
    it('should return array with one date', () => {
      expect(expandTimedEvent('2026-04-20T10:00:00Z', '2026-04-20T18:00:00Z')).toEqual([
        '2026-04-20',
      ]);
    });
  });

  describe('with multi-day timed event', () => {
    it('should return array of all dates (inclusive of end day)', () => {
      expect(expandTimedEvent('2026-04-20T10:00:00Z', '2026-04-22T15:00:00Z')).toEqual([
        '2026-04-20',
        '2026-04-21',
        '2026-04-22',
      ]);
    });
  });

  describe('with invalid dates', () => {
    it('should return empty array', () => {
      expect(expandTimedEvent('invalid', '2026-04-20T10:00:00Z')).toEqual([]);
      expect(expandTimedEvent('2026-04-20T10:00:00Z', 'invalid')).toEqual([]);
    });
  });
});

describe('indexEvents', () => {
  describe('with empty events array', () => {
    it('should return empty reservedDays and priceByDay', () => {
      const result = indexEvents([]);
      expect(result.reservedDays.size).toBe(0);
      expect(result.priceByDay.size).toBe(0);
    });
  });

  describe('with reserva event', () => {
    it('should add date to reservedDays', () => {
      const events = [
        {
          summary: 'reserva',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
      ];
      const result = indexEvents(events);
      expect(result.reservedDays.has('2026-04-20')).toBe(true);
    });
  });

  describe('with precio event', () => {
    it('should add day with price to priceByDay', () => {
      const events = [
        {
          summary: 'precio 100',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
      ];
      const result = indexEvents(events);
      expect(result.priceByDay.get('2026-04-20')).toBe(100);
    });
  });

  describe('when same day has both reserva and precio', () => {
    it('should prefer reserva over precio', () => {
      const events = [
        {
          summary: 'reserva',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
        {
          summary: 'precio 100',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
      ];
      const result = indexEvents(events);
      expect(result.reservedDays.has('2026-04-20')).toBe(true);
      expect(result.priceByDay.has('2026-04-20')).toBe(false);
    });
  });

  describe('when same day has multiple precio events', () => {
    it('should keep the highest price', () => {
      const events = [
        {
          summary: 'precio 50',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
        {
          summary: 'precio 150',
          description: null,
          start: { date: '2026-04-20', dateTime: null },
          end: { date: '2026-04-21', dateTime: null },
        },
      ];
      const result = indexEvents(events);
      expect(result.priceByDay.get('2026-04-20')).toBe(150);
    });
  });
});

describe('buildDays', () => {
  describe('with no reserved or priced days', () => {
    it('should mark all days as unavailable', () => {
      const result = buildDays(2026, 4, new Set(), new Map());
      expect(result.length).toBe(30);
      expect(result.every((d) => d.status === 'unavailable')).toBe(true);
    });
  });

  describe('with some reserved days', () => {
    it('should mark reserved days correctly', () => {
      const reserved = new Set(['2026-04-20', '2026-04-21']);
      const result = buildDays(2026, 4, reserved, new Map());
      expect(result[19].status).toBe('reserved');
      expect(result[20].status).toBe('reserved');
      expect(result[0].status).toBe('unavailable');
    });
  });

  describe('with some priced days', () => {
    it('should mark priced days with price', () => {
      const prices = new Map([['2026-04-20', 100]]);
      const result = buildDays(2026, 4, new Set(), prices);
      expect(result[19].status).toBe('available');
      expect(result[19].price).toBe(100);
    });
  });

  describe('with both reserved and priced days', () => {
    it('should respect precedence: reserved > priced > unavailable', () => {
      const reserved = new Set(['2026-04-20']);
      const prices = new Map([['2026-04-21', 100]]);
      const result = buildDays(2026, 4, reserved, prices);
      expect(result[19].status).toBe('reserved');
      expect(result[20].status).toBe('available');
      expect(result[0].status).toBe('unavailable');
    });
  });
});

describe('buildFallbackResponse', () => {
  describe('fallback for April 2026', () => {
    it('should mark all 30 days as unavailable', () => {
      const result = buildFallbackResponse(2026, 4);
      expect(result.year).toBe(2026);
      expect(result.month).toBe(4);
      expect(result.fallback).toBe(true);
      expect(result.days.length).toBe(30);
      expect(result.days.every((d) => d.status === 'unavailable')).toBe(true);
    });
  });

  describe('fallback for February in leap year', () => {
    it('should mark 29 days as unavailable', () => {
      const result = buildFallbackResponse(2024, 2);
      expect(result.days.length).toBe(29);
    });
  });

  describe('fallback for February in non-leap year', () => {
    it('should mark 28 days as unavailable', () => {
      const result = buildFallbackResponse(2025, 2);
      expect(result.days.length).toBe(28);
    });
  });
});
