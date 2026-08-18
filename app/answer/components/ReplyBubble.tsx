import type { OnseolReply } from "../../today/prototype/types";

type ReplyBubbleProps = {
  reply: OnseolReply;
};

export function ReplyBubble({ reply }: ReplyBubbleProps) {
  return (
    <article className="max-w-[85%] self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
    </article>
  );
}
