import { io } from "socket.io-client";

export const socket = io(
  "https://tic-tac-toe-online-cv21.onrender.com"
);
