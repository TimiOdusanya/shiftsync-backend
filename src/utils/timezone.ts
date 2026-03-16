export function toLocationTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function parseInTimezone(dateStr: string, timezone: string): Date {
  return new Date(new Date(dateStr).toLocaleString("en-US", { timeZone: timezone }));
}

export function getShiftDateInLocation(utcDate: Date, timezone: string): { date: Date; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  const date = new Date(
    Number(get("year")),
    Number(get("month")) - 1,
    Number(get("day")),
    Number(get("hour")),
    Number(get("minute"))
  );
  return { date, hour: Number(get("hour")) };
}

/**
 * Get UTC range for a calendar day from "HH:mm"-"HH:mm" in timezone.
 * dateUtc: any moment on that calendar day (UTC). We use it to get the date in the given timezone.
 */
export function getAvailabilityWindowUtc(
  dateUtc: Date,
  startTime: string,
  endTime: string,
  timezone: string
): { start: Date; end: Date } {
  const dayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dateUtc);
  const get = (type: string) => dayParts.find((p) => p.type === type)?.value ?? "0";
  const localHour = Number(get("hour"));
  const localMinute = Number(get("minute"));
  const localSecond = Number(get("second"));
  const msSinceMidnight =
    (localHour * 3600 + localMinute * 60 + localSecond) * 1000;
  const midnightUtc = new Date(dateUtc.getTime() - msSinceMidnight);

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMs = (sh * 3600 + sm * 60) * 1000;
  let endMs = (eh * 3600 + em * 60) * 1000;
  if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;

  return {
    start: new Date(midnightUtc.getTime() + startMs),
    end: new Date(midnightUtc.getTime() + endMs),
  };
}

/** Get day of week (0=Sun, 6=Sat) in the given timezone for a UTC date. */
export function getDayOfWeekInTimezone(dateUtc: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" });
  const parts = formatter.formatToParts(dateUtc);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday ?? "Sun"] ?? 0;
}
