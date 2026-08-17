import { ServiceNav } from "../components/navigation/ServiceNav";

export default function MePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl items-center px-5 py-10 sm:px-8">
        <section className="space-y-3">
          <p className="text-sm text-muted">내 정보</p>
          <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
            내 기록
          </h1>
          <p className="max-w-xl leading-7 text-muted">
            내가 남긴 온설과 답변을 보는 화면은 로그인 흐름과 함께 다룹니다.
          </p>
        </section>
      </main>
    </div>
  );
}
