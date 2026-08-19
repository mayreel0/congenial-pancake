export function TypingBubble() {
  return (
    <div
      aria-live="polite"
      className="onseol-bubble-enter flex max-w-[85%] items-center gap-1 self-end rounded-lg bg-primary/10 px-4 py-3 sm:max-w-[70%]"
    >
      <span className="sr-only">입력 중</span>
      <span className="onseol-typing-dot h-1.5 w-1.5 rounded-full bg-current" />
      <span
        className="onseol-typing-dot h-1.5 w-1.5 rounded-full bg-current"
        style={{ animationDelay: "160ms" }}
      />
      <span
        className="onseol-typing-dot h-1.5 w-1.5 rounded-full bg-current"
        style={{ animationDelay: "320ms" }}
      />
    </div>
  );
}
