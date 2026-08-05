import ComfortMain from "@/components/ComfortMain";
import { auth } from "@/lib/auth";
import {
  hasWrittenComfortRequestToday,
  listAnswerableComfortRequests,
  listRecentComfortExamples
} from "@/server/comfort";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const [recentExamples, answerableRequests, hasRequestedToday] = await Promise.all([
    listRecentComfortExamples(),
    userId ? listAnswerableComfortRequests(userId) : Promise.resolve([]),
    userId ? hasWrittenComfortRequestToday(userId) : Promise.resolve(false)
  ]);

  return (
    <ComfortMain
      isAuthenticated={Boolean(userId)}
      hasRequestedToday={hasRequestedToday}
      recentExamples={recentExamples}
      answerableRequests={answerableRequests}
    />
  );
}
