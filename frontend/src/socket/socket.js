import { io } from "socket.io-client";
import { API_BASE_URL, BACKEND_URL } from "../lib/config";

// Har connect / reconnect se pehle chhota socket token lo.
// Deploy par backend alag domain par hai aur kai browsers wahan cookie
// nahi bhejte - token se login pakka verify hota hai.
const fetchSocketToken = async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/socket-token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.token || null;
  } catch {
    return null;
  }
};

const socket = io(BACKEND_URL, {
  withCredentials: true,
  autoConnect: false,
  auth: (cb) => {
    fetchSocketToken().then((token) => cb(token ? { token } : {}));
  },
});

// Token expire ho gaya ho to connection reject hota hai - thodi der baad
// dobara try karo (tab tak axios naya login token le aata hai).
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
