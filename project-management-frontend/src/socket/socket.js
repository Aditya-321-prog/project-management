import { io } from "socket.io-client";
import { BACKEND_URL } from "../lib/config";

const socket = io(BACKEND_URL, {
  withCredentials: true,
  autoConnect: false,
});

// Server ab login cookie check karta hai. Agar token expire ho gaya ho to
// connection reject hota hai - thodi der baad dobara try karo
// (tab tak axios naya token le aata hai).
let retryTimer = null;

socket.on("connect_error", (error) => {
  if (error?.message === "Unauthorized" && !retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!socket.connected && socket.shouldBeConnected) {
        socket.connect();
      }
    }, 5000);
  }
});

export const connectSocket = () => {
  socket.shouldBeConnected = true;
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  socket.shouldBeConnected = false;
  socket.disconnect();
};

export default socket;
