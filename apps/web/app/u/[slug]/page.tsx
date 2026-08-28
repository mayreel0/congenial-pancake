"use client";

import { useParams } from "next/navigation";
import { ApiError } from "../../lib/api";
import { ServiceNav } from "../../components/navigation/ServiceNav";
import { parseProfileSlug } from "../../lib/profile/slug";
import type { PublicProfileDto } from "../../lib/profile/api";
import { usePublicProfileQuery } from "../../lib/profile/queries";
import { ProfilePostCard } from "./components/ProfilePostCard";

type ProfileContentProps = {
  slug: string;
};

// Early return per branch instead of a nested ternary — matches
// apps/admin/app/components/AdminStatusGate.tsx's pattern.
function ProfileContent({ slug }: ProfileContentProps) {
  const parsed = parseProfileSlug(slug);
  const query = usePublicProfileQuery(
    parsed?.nickname ?? null,
    parsed?.discriminator ?? null,
  );

  if (!parsed) {
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <p className="max-w-xl leading-7 text-muted">
          잘못된 프로필 주소입니다.
        </p>
      </section>
    );
  }

  if (query.isPending) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
        불러오는 중입니다.
      </p>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.statusCode === 404;
    return (
      <section className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <p className="max-w-xl leading-7 text-muted">
          {notFound
            ? "존재하지 않는 프로필입니다."
            : "프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."}
        </p>
      </section>
    );
  }

  return <ProfileBody profile={query.data} />;
}

function ProfileBody({ profile }: { profile: PublicProfileDto }) {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <p className="text-sm text-muted">온설</p>
        <h1 className="text-2xl font-semibold tracking-normal sm:text-4xl">
          {profile.nickname}
          <span className="text-muted">#{profile.nicknameDiscriminator}</span>
        </h1>
        <p className="max-w-xl leading-7 text-muted">
          이 계정이 닉네임을 공개하기로 선택한 글만 모아봤어요.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal">남긴 고민</h2>
        {profile.requests.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
            공개한 고민이 없습니다.
          </p>
        ) : (
          <ol className="space-y-2">
            {profile.requests.map((request) => (
              <ProfilePostCard
                body={request.body}
                createdAt={request.createdAt}
                eyebrow="고민"
                key={request.id}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-normal">남긴 답변</h2>
        {profile.replies.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-5 text-sm text-muted shadow-sm">
            공개한 답변이 없습니다.
          </p>
        ) : (
          <ol className="space-y-2">
            {profile.replies.map((reply) => (
              <ProfilePostCard
                body={reply.body}
                createdAt={reply.createdAt}
                eyebrow={`"${reply.requestBody}"에 남긴 답변`}
                key={reply.id}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams<{ slug: string }>();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/u" />
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:px-8">
        <ProfileContent slug={params.slug} />
      </main>
    </div>
  );
}
