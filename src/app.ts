import express from "express";
import { createServer } from "http";
import cors from "cors";
import { env } from "./config";
import { routes } from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { initSocketServer } from "./sockets";
import { httpLogger } from "./lib/log/httpLogger";
import { logger } from "./lib/log/logger";

const app = express();
const httpServer = createServer(app);

app.use(httpLogger);
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

initSocketServer(httpServer);

export { app, httpServer };

export function startServer(): void {
  httpServer.listen(env.PORT, () => {
    logger.info(`App running on port ${env.PORT}.`);
  });
}
