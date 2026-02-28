import express from "express";
import { basicAuth } from "./middleware/auth.middleware.js";
import bulkUploadRouter from "./routes/bulk-upload.routes.js";

const app = express();

app.use(express.json());
app.use(basicAuth);
app.use("/", bulkUploadRouter);

export default app;
