import { DisplayMode, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password1234", 10);
  const author = await prisma.user.upsert({
    where: { email: "author@example.com" },
    update: {},
    create: {
      email: "author@example.com",
      nickname: "햇살작성자",
      passwordHash
    }
  });

  await prisma.user.upsert({
    where: { email: "moderator@example.com" },
    update: { isModerator: true },
    create: {
      email: "moderator@example.com",
      nickname: "운영자",
      passwordHash,
      isModerator: true
    }
  });

  await prisma.praisePost.create({
    data: {
      authorUserId: author.id,
      displayMode: DisplayMode.NICKNAME,
      title: "오늘 미루던 병원 예약을 했어요",
      body: "계속 미뤘는데 드디어 전화해서 예약까지 끝냈습니다.",
      promptAnswers: {
        accomplished: "병원 예약",
        praisePoint: "미루던 일을 끝낸 점",
        tone: "차분하고 다정하게"
      }
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
