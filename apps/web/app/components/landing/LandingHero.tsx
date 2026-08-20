import { EntryActions } from "./EntryActions";

export function LandingHero() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-accent">
          정답고 따뜻하게 나누는 이야기
        </p>
        <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
          온설
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted">
          오늘 힘들었던 일이나 칭찬받고 싶은 일을 짧게 남기면, 누군가 담백하게 답장을 남기는 공간입니다.
        </p>
      </div>
      <EntryActions />
    </section>
  );
}
