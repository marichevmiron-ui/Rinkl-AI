export interface MediaItem {
  name: string;
  type: string;
  size: number;
  data: string; // Base64
  url: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isError?: boolean;
  timestamp: string; // Kept for sorting, but hidden in UI
  media?: MediaItem[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Language = 'ru' | 'en' | 'es' | 'cn' | 'de';

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
}

export const SUPPORTED_LANGUAGES: { [key in Language]: string } = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  cn: 'Chinese',
  de: 'Deutsch'
};