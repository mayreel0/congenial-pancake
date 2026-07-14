import PraiseRoom from "@/components/PraiseRoom";
import { db } from "@/lib/db";

export default async function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await db.praisePost.findUniqueOrThrow({
    where: { id: postId },
    include: {
      author: { select: { nickname: true } },
      comments: {
        where: { visibilityState: "VISIBLE" },
        include: {
          author: { select: { nickname: true } },
          reactions: true,
          replies: { where: { visibilityState: "VISIBLE" } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  return <PraiseRoom post={post} />;
}
