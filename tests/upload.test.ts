import request from "supertest";
import { promises as fs } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import app from "../src/app.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DB_PATH = resolve(__dirname, "../data/bulk-upload-temp.json");

const VALID_CSV = `name,age,email\nAlice,30,alice@example.com\nBob,25,bob@example.com`;
const VALID_CREDENTIALS =
  "Basic " + Buffer.from("admin:123456").toString("base64");
const BAD_CREDENTIALS =
  "Basic " + Buffer.from("wrong:creds").toString("base64");

async function resetDb() {
  const fresh = {
    records: [],
    metadata: {
      createdAt: null,
      updatedAt: null,
      description:
        "Temporary store for bulk upload records (see BulkUploadRecord model). Replace nulls with ISO 8601 dates when writing.",
    },
  };
  await fs.writeFile(DB_PATH, JSON.stringify(fresh, null, 2), "utf-8");
}

async function run() {
  let passed = 0;
  let failed = 0;

  function assert(description: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ ${description}`);
      passed++;
    } else {
      console.error(`  ❌ ${description}`);
      failed++;
    }
  }

  await resetDb();
  console.log("\n--- Bulk Upload Service Tests ---\n");

  console.log("1. Authentication");

  let res = await request(app).get("/records");
  assert("GET /records with no auth returns 401", res.status === 401);

  res = await request(app).post("/upload");
  assert("POST /upload with no auth returns 401", res.status === 401);

  res = await request(app)
    .get("/records")
    .set("Authorization", BAD_CREDENTIALS);
  assert("GET /records with wrong credentials returns 401", res.status === 401);

  console.log("\n2. File validation");

  res = await request(app)
    .post("/upload")
    .set("Authorization", VALID_CREDENTIALS)
    .attach("file", Buffer.from("some data"), {
      filename: "test.txt",
      contentType: "text/plain",
    });
  assert("POST /upload with non-CSV file returns 400", res.status === 400);

  res = await request(app)
    .post("/upload")
    .set("Authorization", VALID_CREDENTIALS);
  assert("POST /upload with no file returns 400", res.status === 400);

  console.log("\n3. Upload");

  res = await request(app)
    .post("/upload")
    .set("Authorization", VALID_CREDENTIALS)
    .attach("file", Buffer.from(VALID_CSV), {
      filename: "test.csv",
      contentType: "text/csv",
    });
  assert("POST /upload with valid CSV returns 200", res.status === 200);
  assert("Response contains inserted count of 2", res.body.inserted === 2);

  console.log("\n4. GET /records");

  res = await request(app)
    .get("/records")
    .set("Authorization", VALID_CREDENTIALS);
  assert("GET /records returns 200", res.status === 200);
  assert("Records array contains 2 entries", res.body.records.length === 2);
  assert(
    "Each record has id, data, status, createdAt",
    res.body.records.every(
      (r: { id: string; data: object; status: string; createdAt: string }) =>
        r.id && r.data && r.status === "pending" && r.createdAt,
    ),
  );

  console.log("\n5. Append behaviour");

  await request(app)
    .post("/upload")
    .set("Authorization", VALID_CREDENTIALS)
    .attach("file", Buffer.from(VALID_CSV), {
      filename: "test.csv",
      contentType: "text/csv",
    });

  res = await request(app)
    .get("/records")
    .set("Authorization", VALID_CREDENTIALS);
  assert(
    "Second upload appends — total records is 4",
    res.body.records.length === 4,
  );

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`);

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
