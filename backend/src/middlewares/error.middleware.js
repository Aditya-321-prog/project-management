import mongoose from "mongoose";
import multer from "multer";
import { ApiError } from "../utils/api-error.js";
import { isProduction } from "../utils/config.js";

// Ye middleware pehle nahi tha, isliye Express har error ko HTML page
// bana ke bhejta tha aur frontend ko error.response.data.message kabhi milta hi nahi tha.
// Ab har error ek hi JSON format me jaata hai:
// { success: false, statusCode, message, errors }

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Multer (file upload) errors
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "File is too large (max 50 MB)"
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "Too many files or wrong file field"
            : error.message;
      error = new ApiError(400, message);
    }
    // Galat MongoDB id (jaise /tasks/abc)
    else if (error instanceof mongoose.Error.CastError) {
      error = new ApiError(400, `Invalid ${error.path}`);
    }
    // Schema validation fail
    else if (error instanceof mongoose.Error.ValidationError) {
      const errors = Object.values(error.errors).map((e) => ({
        [e.path]: e.message,
      }));
      error = new ApiError(400, "Invalid data", errors);
    }
    // Duplicate key (unique index)
    else if (error?.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || "field";
      error = new ApiError(409, `${field} already exists`);
    }
    // Body me galat JSON
    else if (error?.type === "entity.parse.failed") {
      error = new ApiError(400, "Invalid JSON body");
    } else if (error?.type === "entity.too.large") {
      error = new ApiError(413, "Request body is too large");
    } else {
      const statusCode = error?.statusCode || error?.status || 500;
      error = new ApiError(
        statusCode,
        statusCode === 500 && isProduction
          ? "Something went wrong"
          : error?.message || "Something went wrong",
      );
    }
  }

  if (error.statusCode >= 500) {
    console.error(err);
  }

  return res.status(error.statusCode).json({
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(!isProduction && error.statusCode >= 500 ? { stack: err?.stack } : {}),
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
};
