/**
 * Formats any Date or string timestamp into the Asia/Kolkata timezone
 * Output format: DD MMM YYYY, hh:mm:ss A (e.g. 13 Jul 2026, 06:19:10 PM)
 */
export function formatKolkataTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "N/A";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Invalid Date";

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const day = partMap.day;
    const month = partMap.month; // e.g. "Jul"
    const year = partMap.year;
    const hour = partMap.hour;
    const minute = partMap.minute;
    const second = partMap.second;
    const period = partMap.dayPeriod?.toUpperCase() || ""; // AM/PM

    return `${day} ${month} ${year}, ${hour}:${minute}:${second} ${period}`;
  } catch (error) {
    console.error("Error formatting Kolkata time:", error);
    return "Error Date";
  }
}
