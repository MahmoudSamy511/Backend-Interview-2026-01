import { Router } from "express";
import { rateLimiter } from "../middleware/rate-limit.middleware.js";
import { uploadMiddleware } from "../middleware/upload.middleware.js";
import {
  uploadCSV,
  getRecords,
  deleteRecords,
} from "../controllers/bulk-upload.controller.js";

const router = Router();

router.post("/upload", rateLimiter, uploadMiddleware, uploadCSV);
router.get("/records", getRecords);
router.delete("/records", deleteRecords);

export default router;
