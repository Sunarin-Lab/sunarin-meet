import { createContext } from "react";
import { io } from "socket.io-client";

export const socket = io("https://sfu-kulon.server:5000", { secure: true });
export const SocketContext = createContext();
