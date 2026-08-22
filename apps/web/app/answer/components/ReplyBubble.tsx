import type { ReplyDto } from "../../lib/replies/api";

type ReplyBubbleProps = {
  reply: ReplyDto;
};

export function ReplyBubble({ reply }: ReplyBubbleProps) {
  return (
    <article className="onseol-bubble-enter max-w-[85%] self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]">
      <p className="text-sm leading-6 text-foreground">{reply.body}</p>
    </article>
  );
}
