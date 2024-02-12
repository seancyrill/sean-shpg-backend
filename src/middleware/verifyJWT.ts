import express from "express";
import jwt from "jsonwebtoken";
import { reqTypes } from "../types/controllerReqTypes";

type ExtRequest = reqTypes & {
  userInfo: {};
};
export function verifyJWT(
  req: ExtRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.userInfo = decoded;
    next();
  });
}
