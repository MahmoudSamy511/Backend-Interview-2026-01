import type { Request, Response, NextFunction } from "express";
import { AUTH_USER, AUTH_PASSWORD } from "../config.js";

export function basicAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers["authorization"];

  if (!header || !header.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="bulk-upload"');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const base64 = header.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [user, password] = decoded.split(":");

  if (user !== AUTH_USER || password !== AUTH_PASSWORD) {
    res.setHeader("WWW-Authenticate", 'Basic realm="bulk-upload"');
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
