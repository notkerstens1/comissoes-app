import {
  format,
  startOfWeek,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
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

// Mes passado: 1o dia do mes anterior -> ultimo dia do mes anterior
export function getLastMonthRange(): { start: string; end: string; label: string } {
  const now = getNow();
  const lastMonth = subMonths(now, 1);
  const start = startOfMonth(lastMonth);
  const end = endOfMonth(lastMonth);
  return {
    start: formatDateStr(start),
    end: formatDateStr(end),
    label: `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")} (Mes passado)`,
  };
}

// Gera range a partir de preset
export type DatePreset = "current_week" | "7d" | "30d" | "current_month" | "last_month" | "month" | "custom";

// Range de um mes especifico ("YYYY-MM"): 1o dia -> ultimo dia do mes
export function getMonthRange(mesStr: string): { start: string; end: string; label: string } {
  const base = parseISO(`${mesStr}-01T00:00:00`);
  const start = startOfMonth(base);
  const end = endOfMonth(base);
  return {
    start: formatDateStr(start),
    end: formatDateStr(end),
    label: getNomeMes(mesStr),
  };
}

// Lista de meses recentes (do mes atual para tras, ate um piso), para seletor
export function getRecentMonths(floor = "2026-01"): { value: string; label: string }[] {
  const now = getNow();
  const floorDate = parseISO(`${floor}-01T00:00:00`);
  const out: { value: string; label: string }[] = [];
  let cursor = startOfMonth(now);
  let guard = 0;
  while (cursor >= floorDate && guard < 36) {
    const value = formatDateStr(cursor).slice(0, 7);
    out.push({ value, label: getNomeMes(value) });
    cursor = subMonths(cursor, 1);
    guard++;
  }
  return out;
}

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
    case "last_month":
      return getLastMonthRange();
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

// Formata label para range customizado (blindado contra datas vazias/invalidas,
// que ocorrem quando o <input type="date"> fica momentaneamente sem valor ao editar)
export function formatCustomRangeLabel(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return "Selecione o periodo";
  const start = parseISO(startStr);
  const end = parseISO(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "Selecione o periodo";
  return `${format(start, "dd/MM")} - ${format(end, "dd/MM/yyyy")} (Personalizado)`;
}
