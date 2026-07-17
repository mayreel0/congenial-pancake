import Link from "next/link";
import { signupWithCredentials } from "@/app/signup/actions";

const errorMessages: Record<string, string> = {
  email: "이미 가입된 이메일입니다. 기존 계정으로 로그인해주세요.",
  nickname: "이미 사용 중인 닉네임입니다.",
  invalid: "입력값을 다시 확인해주세요.",
  unknown: "회원가입을 완료하지 못했습니다. 잠시 후 다시 시도해주세요."
};

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = rawError ? errorMessages[rawError] ?? errorMessages.unknown : null;

  return (
    <section className="page-section">
      <h1>회원가입</h1>
      <p>칭찬을 남기고 알림을 받으려면 계정을 만들어주세요.</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <form action={signupWithCredentials}>
        <label>
          이메일
          <input name="email" type="email" required />
        </label>
        <label>
          닉네임
          <input name="nickname" required minLength={2} maxLength={24} />
        </label>
        <label>
          비밀번호
          <input name="password" type="password" required minLength={8} maxLength={72} />
        </label>
        <button type="submit">가입하기</button>
      </form>
      <p className="muted-copy">
        제재된 계정은 새 계정으로 우회할 수 없습니다. 문제가 있었다면 기존 계정의 제한 해제를 요청해주세요.
      </p>
      <p>
        이미 계정이 있다면 <Link href="/login">로그인</Link>으로 이동해주세요.
      </p>
    </section>
  );
}
