/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `sheets` (echte Google Sheets mit Login) oder `demo` (Fixtures ohne Login). */
  readonly VITE_DATA?: 'sheets' | 'demo';
  /** Öffentliche OAuth Client ID aus der Google Cloud Console. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
