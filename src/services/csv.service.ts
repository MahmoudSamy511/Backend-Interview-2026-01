import { Readable } from "stream";
import { parse } from "csv-parse";
import { v4 as uuidv4 } from "uuid";
import type { BulkUploadRecord } from "../models/bulk-upload-record.model.js";

export function parseCSV(buffer: Buffer): Promise<BulkUploadRecord[]> {
  return new Promise((resolve, reject) => {
    const records: BulkUploadRecord[] = [];
    const now = new Date().toISOString();

    const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

    parser.on("readable", () => {
      let row: Record<string, string>;
      while ((row = parser.read() as Record<string, string>) !== null) {
        records.push({
          id: uuidv4(),
          data: row,
          status: "pending",
          createdAt: now,
        });
      }
    });

    parser.on("error", reject);
    parser.on("end", () => resolve(records));

    Readable.from(buffer).pipe(parser);
  });
}
