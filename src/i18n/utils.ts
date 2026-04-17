import es from './es.json';
import en from './en.json';

export type Lang = 'es' | 'en';

const translations: Record<Lang, typeof es> = { es, en };

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  return lang === 'en' ? 'en' : 'es';
}

export function useTranslations(lang: Lang) {
  return translations[lang];
}

export function getAlternateLang(lang: Lang): Lang {
  return lang === 'es' ? 'en' : 'es';
}

export function getHomePath(lang: Lang): string {
  return lang === 'es' ? '/es/' : '/en/';
}

export function getAlternateHomePath(lang: Lang): string {
  return lang === 'es' ? '/en/' : '/es/';
}

export function getBookingsPath(lang: Lang): string {
  return lang === 'es' ? '/es/reservas' : '/en/bookings';
}

export function getAlternateBookingsPath(lang: Lang): string {
  return lang === 'es' ? '/en/bookings' : '/es/reservas';
}
