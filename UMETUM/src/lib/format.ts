import i18n from '@/i18n';

/** Langue des dates et montants. Sans données yiddish dans le moteur, on prend l'hébreu. */
export function locale(): string {
  const lang = i18n.language || 'fr';
  if (lang === 'yi' && Intl.DateTimeFormat.supportedLocalesOf(['yi']).length === 0) return 'he';
  return lang;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat(locale(), { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Symbole de la devise (€, ₪, $...) pour les champs de saisie. */
export function currencySymbol(currency: string): string {
  const parts = new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency.toUpperCase();
}
