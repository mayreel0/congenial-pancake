import type { Adapter, AdapterUser } from "next-auth/adapters";
import { generateNicknameSuggestion } from "@/server/signup";

type AdapterUserWithNickname = AdapterUser & { nickname: string; nicknameSetupRequired: boolean };

export function withSignupNickname(adapter: Adapter): Adapter {
  return {
    ...adapter,
    async createUser(user) {
      if (!adapter.createUser) {
        throw new Error("AUTH_ADAPTER_CREATE_USER_UNAVAILABLE");
      }
      const nickname = await generateNicknameSuggestion();
      return adapter.createUser({
        ...user,
        nickname,
        nicknameSetupRequired: true
      } as AdapterUserWithNickname);
    }
  };
}
