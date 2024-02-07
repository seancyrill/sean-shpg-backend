import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const fsPromises = fs.promises;

export async function logEvents(msg: string, fileName: string) {
  const date = new Date();
  const today = new Intl.DateTimeFormat("en-us", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

  const logItem = `${today}\t${crypto.randomUUID()}\t${msg}\n`;

  try {
    //checks for directory
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fsPromises.mkdir(path.join(__dirname, "..", "logs"));
    }
    //write log
    await fsPromises.appendFile(
      path.join(__dirname, "..", "logs", fileName),
      logItem
    );
  } catch (err) {
    console.error(err.message);
  }
}

export async function logger(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  logEvents(
    `${req.method}\t${req.url}\t${req.headers.origin}`,
    "requestLog.log"
  );
  console.log(`${req.method} ${req.path}`);
  next();
}
