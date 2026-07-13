export default function LoginPage() {
  return (
    <section className="page-section">
      <h1>로그인</h1>
      <p>글쓰기, 칭찬 댓글, 감사 반응은 로그인 후 사용할 수 있습니다.</p>
      <form method="post" action="/api/auth/callback/credentials">
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
    </section>
  );
}
