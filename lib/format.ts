import type { Language } from "@/lib/i18n";

const locales: Record<Language, string> = {
  en: "en-ET",
  am: "am-ET",
};

export function formatCurrency(value: number, language: Language = "en") {
  return new Intl.NumberFormat(locales[language], {
    style: "currency",
    currency: "ETB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: string, language: Language = "en") {
  return new Intl.DateTimeFormat(locales[language], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function shortOrderId(id: string) {
  return id.split("-").at(-1)?.toUpperCase() ?? id.toUpperCase();
}
