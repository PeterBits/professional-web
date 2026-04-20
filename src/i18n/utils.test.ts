import { describe, it, expect } from 'vitest';
import {
  getLangFromUrl,
  getAlternateLang,
  getHomePath,
  getAlternateHomePath,
  getBookingsPath,
  getAlternateBookingsPath,
} from './utils';

describe('getLangFromUrl', () => {
  describe('with /es/ path', () => {
    it('should return "es"', () => {
      const url = new URL('https://example.com/es/reservas');
      expect(getLangFromUrl(url)).toBe('es');
    });
  });

  describe('with /en/ path', () => {
    it('should return "en"', () => {
      const url = new URL('https://example.com/en/bookings');
      expect(getLangFromUrl(url)).toBe('en');
    });
  });

  describe('with root path', () => {
    it('should default to "es"', () => {
      const url = new URL('https://example.com/');
      expect(getLangFromUrl(url)).toBe('es');
    });
  });

  describe('with invalid lang', () => {
    it('should default to "es"', () => {
      const url = new URL('https://example.com/fr/page');
      expect(getLangFromUrl(url)).toBe('es');
    });
  });

  describe('with nested path in es', () => {
    it('should return "es"', () => {
      const url = new URL('https://example.com/es/reservas/2026-04');
      expect(getLangFromUrl(url)).toBe('es');
    });
  });

  describe('with nested path in en', () => {
    it('should return "en"', () => {
      const url = new URL('https://example.com/en/bookings/2026-04');
      expect(getLangFromUrl(url)).toBe('en');
    });
  });
});

describe('getAlternateLang', () => {
  it('should toggle es to en', () => {
    expect(getAlternateLang('es')).toBe('en');
  });

  it('should toggle en to es', () => {
    expect(getAlternateLang('en')).toBe('es');
  });
});

describe('getHomePath', () => {
  it('should return /es/ for es', () => {
    expect(getHomePath('es')).toBe('/es/');
  });

  it('should return /en/ for en', () => {
    expect(getHomePath('en')).toBe('/en/');
  });
});

describe('getAlternateHomePath', () => {
  it('should return /en/ for es', () => {
    expect(getAlternateHomePath('es')).toBe('/en/');
  });

  it('should return /es/ for en', () => {
    expect(getAlternateHomePath('en')).toBe('/es/');
  });
});

describe('getBookingsPath', () => {
  it('should return /es/reservas for es', () => {
    expect(getBookingsPath('es')).toBe('/es/reservas');
  });

  it('should return /en/bookings for en', () => {
    expect(getBookingsPath('en')).toBe('/en/bookings');
  });
});

describe('getAlternateBookingsPath', () => {
  it('should return /en/bookings for es', () => {
    expect(getAlternateBookingsPath('es')).toBe('/en/bookings');
  });

  it('should return /es/reservas for en', () => {
    expect(getAlternateBookingsPath('en')).toBe('/es/reservas');
  });
});
