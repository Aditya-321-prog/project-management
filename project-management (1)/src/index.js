// dotenv sabse pehle load hona chahiye.
// ES modules me imports hoist ho jaate hain, isliye dotenv.config() neeche likhne se
// app.js / controllers ke load hone tak .env ki values available nahi hoti thi
// (CORS_ORIGIN, GOOGLE_CLIENT_ID jaise variables undefined aate the).
import "dotenv/config";

import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocket } from "./socket/socket.js";
import { allowedOrigins } from "./utils/config.js";

const port = process.env.PORT ?? 8000;

const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

initializeSocket(io);

connectDB()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
