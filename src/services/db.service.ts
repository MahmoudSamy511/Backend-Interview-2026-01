import { promises as fs } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import type { BulkUploadRecord } from "../models/bulk-upload-record.model.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DB_PATH = resolve(__dirname, "../../data/bulk-upload-temp.json");

interface DbShape {
  records: BulkUploadRecord[];
  metadata: {
    createdAt: string | null;
    updatedAt: string | null;
    description: string;
  };
}

export async function readDb(): Promise<DbShape> {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw) as DbShape;
}

export async function writeDb(records: BulkUploadRecord[]): Promise<void> {
  const db = await readDb();
  const now = new Date().toISOString();

  const updated: DbShape = {
    records,
    metadata: {
      createdAt: db.metadata.createdAt ?? now,
      updatedAt: now,
      description: db.metadata.description,
    },
  };

  await fs.writeFile(DB_PATH, JSON.stringify(updated, null, 2), "utf-8");
}
