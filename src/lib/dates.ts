import {
  format,
  startOfWeek,
  subDays,
  startOfMonth,
  eachDayOfInterval,
  parseISO,
  getDaysInMonth,
  differenceInDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "America/Fortaleza";

// Retorna "agora" no timezone de Fortaleza
export function getNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

// Formata Date -> "YYYY-MM-DD"
export function formatDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

// Formata "YYYY-MM-DD" -> "16 de fevereiro"
export function formatDateDisplay(dateStr: string): string {
  return format(parseISO(dateStr), "dd 'de' MMMM", { locale: ptBR });
}

// Formata "YYYY-MM-DD" -> "16/02"
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM");
}

// Formata "YYYY-MM-DD" -> "Dom", "Seg", etc.
export function formatDayOfWeek(dateStr: string): string {
  return format(parseISO(dateStr), "EEE", { locale: ptBR });
}

// Nome do mes: "2026-02" -> "Fevereiro 2026"
export function getNomeMes(mesStr: string): string {
  const [ano, m] = mesStr.split("-");
  const meses = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${meses[parseInt(m) - 1]} ${ano}`;
}

// Semana atual: Domingo -> Hoje (week-to-date)
export function getCurrentWeekRange(): { start: string; end: string; label: string } {
  const now = getNow();
  const start = startOfWeek(now, { weekStartsOn: 0 }); // Domingo
  return {
    start: formatDateStr(start),
    end: formatDateStr(now),
    label: `${format(start, "dd/MM")} - ${format(now, "dd/MM/yyyy")} (Semana atual)`,
  };
}

// Ultimos 7 dias
export function getLast7DaysRange(): { start: string; end: string; label: string } {
  const now = getNow();
  const start = subDays(now, 6);
  return {
    start: formatDateStr(start),
    end: formatDateStr(now),
    label: `${format(start, "dd/MM")} - ${format(now, "dd/MM/yyyy")} (7 dias)`,
  };
}

// Ultimos 30 dias
export function getLast30DaysRange(): { start: string; end: string; label: string } {
  const now = getNow();
  const start = subDays(now, 29);
  return {
    start: formatDateStr(start),
    end: formatDateStr(now),
    label: `${format(start, "dd/MM")} - ${format(now, "dd/MM/yyyy")} (30 dias)`,
  };
}

// Mes atual: 1o dia -> hoje
export function getCurrentMonthRange(): { start: string; end: string; label: string } {
  const now = getNow();
  const start = startOfMonth(now);
  return {
    start: formatDateStr(start),
    end: formatDateStr(now),
    label: `${format(start, "dd/MM")} - ${format(now, "dd/MM/yyyy")} (Mes atual)`,
  };
}

// Array de datas "YYYY-MM-DD" no intervalo
export function getDaysInRange(startStr: string, endStr: string): string[] {
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  return eachDayOfInterval({ start, end }).map(formatDateStr);
}

// Gera range a partir de preset
export type DatePreset = "current_week" | "7d" | "30d" | "current_month" | "custom";

export function getRangeFromPreset(preset: DatePreset): { start: string; end: string; label: string } {
  switch (preset) {
    case "current_week":
      return getCurrentWeekRange();
    case "7d":
      return getLast7DaysRange();
    case "30d":
      return getLast30DaysRange();
    case "current_month":
      return getCurrentMonthRange();
    default:
      return getCurrentWeekRange();
  }
}

// Dias decorridos no mes atual (ate hoje)
export function getDiasDecorridosNoMes(): number {
  const now = getNow();
  const inicio = startOfMonth(now);
  return differenceInDays(now, inicio) + 1;
}

// Total de dias no mes atual
export function getTotalDiasNoMes(): number {
  const now = getNow();
  return getDaysInMonth(now);
}

// Mes atual no formato "YYYY-MM"
export function getMesAtual(): string {
  const now = getNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Formata label para range customizado
export function formatCustomRangeLabel(startStr: string, endStr: string): string {
  return `${format(parseISO(startStr), "dd/MM")} - ${format(parseISO(endStr), "dd/MM/yyyy")} (Personalizado)`;
}
