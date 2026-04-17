/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GOOGLE_CALENDAR_ID?: string;
  readonly GOOGLE_API_KEY?: string;
  readonly PUBLIC_WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
