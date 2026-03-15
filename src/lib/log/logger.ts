import { createLogger, format, transports } from "winston";

function timestamp(): string {
  const d = new Date();
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${y}-${M}-${D} ${h}:${m}:${s}:${ms}`;
}

export const logger = createLogger({
  format: format.combine(
    format.printf((info) => `${timestamp()} ${info.level}: ${info.message}`)
  ),
  transports: [new transports.Console()],
});
