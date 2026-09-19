import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const list = errors.array();
  const extractedErrors = list.map((err) => ({ [err.path]: err.msg }));

  // Pehla error message hi main message bana do, taaki frontend par
  // "Recieved data is not valid" ki jagah asli wajah dikhe
  throw new ApiError(422, list[0]?.msg || "Received data is not valid", extractedErrors);
};
