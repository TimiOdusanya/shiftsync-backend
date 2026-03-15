import morgan from "morgan";
import { logger } from "./logger";

const stream = {
  write(message: string): void {
    const line = message.substring(0, message.lastIndexOf("\n"));
    logger.info(line);
  },
};

export const httpLogger = morgan(
  ":method :url :status :response-time ms - :res[content-length]",
  { stream }
);
