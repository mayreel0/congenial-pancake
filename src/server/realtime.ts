import "server-only";

export type PostRealtimeEvent =
  | { type: "comment.created"; postId: string; commentId: string }
  | { type: "reaction.created"; postId: string; reactionId: string }
  | { type: "reply.created"; postId: string; replyId: string }
  | { type: "comment.visibilityChanged"; postId: string; commentId: string };

type SocketServer = {
  to(room: string): { emit(event: string, payload: PostRealtimeEvent): void };
};

const globalRealtime = globalThis as unknown as { io?: SocketServer };

export function registerSocketServer(io: SocketServer) {
  globalRealtime.io = io;
}

export function publishPostEvent(postId: string, event: PostRealtimeEvent) {
  globalRealtime.io?.to(`post:${postId}`).emit("post:event", event);
}
