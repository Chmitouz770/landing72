import i18n from '@/i18n';

import { formatDay } from './format';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** « Aujourd'hui », « Demain » ou « lun. 3 oct. ». */
export function relativeDayLabel(date: Date): string {
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (diffDays === 0) return i18n.t('session.today');
  if (diffDays === 1) return i18n.t('session.tomorrow');
  return formatDay(date);
}

/** Les N prochains jours à partir d'aujourd'hui (minuit). */
export function nextDays(count: number): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}
