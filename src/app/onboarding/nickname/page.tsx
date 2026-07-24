import Link from "next/link";
import { saveNickname } from "@/app/onboarding/nickname/actions";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  nickname: "이미 사용 중인 닉네임입니다.",
  invalid: "닉네임은 2자 이상 24자 이하로 입력해주세요.",
  unknown: "닉네임을 저장하지 못했습니다. 잠시 후 다시 시도해주세요."
};

export default async function NicknameOnboardingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <section className="page-section">
        <h1>로그인이 필요합니다</h1>
        <p>닉네임 설정은 로그인 후 진행할 수 있습니다.</p>
        <Link href="/login">로그인</Link>
      </section>
    );
  }

  const [params, user] = await Promise.all([
    searchParams,
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, nickname: true }
    })
  ]);
  const rawError = Array.isArray(params.error) ? params.error[0] : params.error;
  const errorMessage = rawError ? errorMessages[rawError] ?? errorMessages.unknown : null;
  const providerName = user.name?.trim() ?? "";

  return (
    <section className="page-section">
      <h1>닉네임 설정</h1>
      <p>칭찬 커뮤니티에서 사용할 이름을 정해주세요. 네이버 이름은 선택했을 때만 사용합니다.</p>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <form action={saveNickname}>
        <input type="hidden" name="providerName" value={providerName} />
        <label>
          닉네임
          <input name="nickname" required minLength={2} maxLength={24} defaultValue={user.nickname} />
        </label>
        {providerName ? (
          <label className="checkbox-label">
            <input type="checkbox" name="useNaverName" value={providerName} />
            네이버 이름 가져오기
          </label>
        ) : null}
        <button type="submit">닉네임 저장</button>
      </form>
    </section>
  );
}
