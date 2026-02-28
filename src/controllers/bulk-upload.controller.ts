import type { Request, Response } from "express";
import { parseCSV } from "../services/csv.service.js";
import { readDb, writeDb } from "../services/db.service.js";

export async function uploadCSV(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const { mimetype, originalname } = req.file;
  const isCSV = mimetype === "text/csv" || originalname.endsWith(".csv");

  if (!isCSV) {
    res.status(400).json({ error: "Only CSV files are accepted" });
    return;
  }

  const newRecords = await parseCSV(req.file.buffer);
  const db = await readDb();
  const merged = [...db.records, ...newRecords];
  await writeDb(merged);

  res.status(200).json({ inserted: newRecords.length });
}

export async function getRecords(_req: Request, res: Response): Promise<void> {
  const db = await readDb();
  res.status(200).json(db);
}

export async function deleteRecords(
  _req: Request,
  res: Response,
): Promise<void> {
  await writeDb([]);
  res.status(200).json({ message: "All records deleted" });
}
