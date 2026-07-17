import Link from "next/link";
import { loginWithCredentials, loginWithNaver } from "@/app/login/actions";

const errorMessages: Record<string, string> = {
  credentials: "이메일 또는 비밀번호를 확인해주세요.",
  naver: "네이버 로그인이 아직 설정되지 않았습니다."
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = rawError ? errorMessages[rawError] : null;

  return (
    <section className="page-section">
      <h1>로그인</h1>
      <p>글쓰기, 칭찬 댓글, 감사 반응은 로그인 후 사용할 수 있습니다.</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <form action={loginWithCredentials}>
        <label>
          이메일
          <input name="email" type="email" required />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" required minLength={8} />
        </label>
        <button type="submit">로그인</button>
      </form>
      <form action={loginWithNaver}>
        <button type="submit" className="secondary-button">네이버로 시작하기</button>
      </form>
      <p>
        아직 계정이 없다면 <Link href="/signup">회원가입</Link>을 먼저 진행해주세요.
      </p>
    </section>
  );
}
