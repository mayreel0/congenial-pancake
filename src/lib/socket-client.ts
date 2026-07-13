import { io } from "socket.io-client";

export function createPostSocket(postId: string) {
  const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000", {
    path: "/api/socket/io"
  });
  socket.emit("post:join", { postId });
  return socket;
}
