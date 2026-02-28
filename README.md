# Bulk Upload Service

## Setup

```bash
npm install
npm run dev
```

Default credentials (change in `src/config.ts`):

- **Username:** `admin`
- **Password:** `123456`

---

## Authentication

All endpoints require **HTTP Basic Auth**.

Set the `Authorization` header:

```
Authorization: Basic <base64(username:password)>
```

Missing or wrong credentials → `401 Unauthorized`.

---

## Rate Limiting

Only the `POST /upload` endpoint is rate limited.

| Setting      | Value               |
| ------------ | ------------------- |
| Window       | 1 minute            |
| Max requests | 15 per window       |
| Scope        | `POST /upload` only |

Exceeding the limit returns `429 Too Many Requests`.
`GET /records` and `DELETE /records` are **not** rate limited.

---

## API Reference

### `POST /upload`

Upload a CSV file to bulk-insert records into the database.

|                  |                        |
| ---------------- | ---------------------- |
| **Auth**         | Required               |
| **Content-Type** | `multipart/form-data`  |
| **Field**        | `file` — a `.csv` file |

**Response `200`**

```json
{ "inserted": 3 }
```

**Error responses**

| Status | Reason                                    |
| ------ | ----------------------------------------- |
| `400`  | No file uploaded                          |
| `400`  | File is not a CSV                         |
| `400`  | File exceeds 100 MB size limit            |
| `401`  | Missing or invalid credentials            |
| `429`  | Rate limit exceeded (max 15 req / minute) |

**Example**

```bash
curl -u admin:secret \
  -F "file=@records.csv" \
  http://localhost:8000/upload
```

---

### `GET /records`

Retrieve all records currently stored in the database.

|          |          |
| -------- | -------- |
| **Auth** | Required |

**Response `200`**

```json
{
  "records": [
    {
      "id": "uuid",
      "data": { "name": "Alice", "age": "30" },
      "status": "pending",
      "createdAt": "2026-02-28T15:36:54.000Z"
    }
  ],
  "metadata": {
    "createdAt": "2026-02-28T15:36:54.000Z",
    "updatedAt": "2026-02-28T15:36:54.000Z",
    "description": "..."
  }
}
```

**Example**

```bash
curl -u admin:123456 http://localhost:8000/records
```

---

### `DELETE /records`

Delete all records from the database.

|          |          |
| -------- | -------- |
| **Auth** | Required |

**Response `200`**

```json
{ "message": "All records deleted" }
```

**Example**

```bash
curl -u admin:123456 -X DELETE http://localhost:8000/records
```

---

## Upload Flow

1. Client sends `POST /upload` with a CSV file
2. Basic Auth middleware validates credentials before anything else
3. `multer` buffers the file in memory — no temp files written to disk
4. `csv.service` wraps the buffer in a `Readable` stream and pipes it through `csv-parse`
5. Each row is mapped to a `BulkUploadRecord` (UUID, `createdAt`, `status: 'pending'`)
6. `db.service` reads the current JSON DB, appends all new records, then writes once
7. Response returns the count of records inserted

---

## CSV Parsing Optimizations

| Technique                    | Effect                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Streaming pipeline**       | Buffer processed as a `Readable` stream — rows emitted one at a time; memory stays flat regardless of file size |
| **Single-pass accumulation** | Records collected in one iteration with no re-scanning or duplicate loops                                       |
| **Single DB write**          | All parsed rows appended in one `writeDb()` call — no per-row I/O                                               |
| **Batch append**             | Existing DB records read once, merged in memory with new batch, flushed once — zero redundant reads             |

---

## Performance Benchmarks

Measured end-to-end on a local machine (CSV parse + UUID generation + JSON write to disk).

| Rows inserted | Response time |
| ------------- | ------------- |
| 100           | ~6 ms         |
| 1,000         | ~31 ms        |
| 10,000        | ~76 ms        |
| 100,000       | ~578 ms       |
| 500,000       | ~3 s          |

**Why it scales well:**

- CSV parsing is fully streamed — memory usage stays flat at any row count
- All records are accumulated in a single pass and flushed to disk in one `writeDb()` call
- At large sizes (100k+) the bottleneck shifts to `JSON.stringify` + `fs.writeFile`, which is expected for a file-based store

---

## Tests

```bash
npm run test
```

Covers:

- Auth rejection (no credentials, wrong credentials)
- File validation (non-CSV, missing file)
- Successful CSV upload and record count
- `GET /records` response shape
- Append behaviour across multiple uploads

---

## npm Scripts

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `npm run dev`   | Run in development mode with hot reload (`tsx`) |
| `npm run build` | Compile TypeScript to `dist/`                   |
| `npm start`     | Run compiled output                             |
| `npm run test`  | Run integration tests                           |
