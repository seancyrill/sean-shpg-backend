import express from "express";
import { logEvents } from "./logger";

export function errorLogger(
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logEvents(
    `${err.name}: ${err.message}\t${req.method}\t${req.url}\t${req.headers.origin}`,
    "errorLog.log"
  );
  console.log(err.message);

  const status = res.statusCode ? res.statusCode : 500;
  res.status(status);

  res.json({ message: err.message });
  next();
}
