import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketServer } from "./src/server/realtime";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => {
    handle(request, response);
  });

  const io = new Server(httpServer, {
    path: "/api/socket/io"
  });

  io.on("connection", (socket) => {
    socket.on("post:join", (payload: { postId?: unknown }) => {
      if (typeof payload.postId === "string" && payload.postId.length > 0) {
        socket.join(`post:${payload.postId}`);
      }
    });
  });

  registerSocketServer(io);

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
