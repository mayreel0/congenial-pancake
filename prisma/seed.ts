import { DisplayMode, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password1234", 10);
  const author = await prisma.user.upsert({
    where: { email: "author@example.com" },
    update: { passwordHash },
    create: {
      email: "author@example.com",
      nickname: "햇살작성자",
      passwordHash
    }
  });

  const moderator = await prisma.user.upsert({
    where: { email: "moderator@example.com" },
    update: { passwordHash, isModerator: true },
    create: {
      email: "moderator@example.com",
      nickname: "운영자",
      passwordHash,
      isModerator: true
    }
  });

  await prisma.comfortRequest.create({
    data: {
      authorUserId: author.id,
      localDate: "2026-08-05",
      displayMode: DisplayMode.ANONYMOUS,
      body: "오늘 작은 실수를 했는데 계속 마음에 남아요. 너무 크게 생각하지 말라는 말을 듣고 싶어요.",
      replies: {
        create: {
          authorUserId: moderator.id,
          displayMode: DisplayMode.NICKNAME,
          body: "그 일이 마음에 남을 수는 있지만, 그 실수 하나로 오늘 전체가 정해지는 건 아닌 것 같아요."
        }
      }
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
