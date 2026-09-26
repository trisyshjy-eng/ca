const TIME_ZONE = "Asia/Seoul";

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", { timeZone: TIME_ZONE });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("ko-KR", { timeZone: TIME_ZONE });
}
