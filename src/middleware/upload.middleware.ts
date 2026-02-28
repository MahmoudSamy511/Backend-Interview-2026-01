import multer, { MulterError } from "multer";
import type { Request, Response, NextFunction } from "express";
import { FILE_SIZE_LIMIT, CSV_FILE_NAME } from "../config.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FILE_SIZE_LIMIT },
});

export function uploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  upload.single(CSV_FILE_NAME)(req, res, (err) => {
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      res
        .status(400)
        .json({
          error: `File too large. Max allowed size is ${FILE_SIZE_LIMIT / (1024 * 1024)} MB.`,
        });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}
