import { ServiceNav } from "../components/navigation/ServiceNav";

export default function AnswerPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/answer" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">답하기</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            누군가에게 짧게 답하기
          </h1>
          <p className="max-w-xl leading-7 text-muted">
            답변이 필요한 온설을 이어서 보여주는 화면은 다음 PR에서 다룹니다.
          </p>
        </section>
      </main>
    </div>
  );
}
