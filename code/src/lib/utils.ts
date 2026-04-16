// Generic utility helpers
// Add shared formatters, validators, and helpers here

export function formatDate(date: Date, locale = "es-ES"): string {
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: Date, locale = "es-ES"): string {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}
