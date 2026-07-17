import type { Adapter, AdapterUser } from "next-auth/adapters";
import { resolveUniqueNickname } from "@/server/signup";

type AdapterUserWithNickname = AdapterUser & { nickname: string };

export function withSignupNickname(adapter: Adapter): Adapter {
  return {
    ...adapter,
    async createUser(user) {
      if (!adapter.createUser) {
        throw new Error("AUTH_ADAPTER_CREATE_USER_UNAVAILABLE");
      }
      const nickname = await resolveUniqueNickname(user.name ?? user.email ?? null);
      return adapter.createUser({
        ...user,
        nickname
      } as AdapterUserWithNickname);
    }
  };
}
