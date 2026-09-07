import type {
  ModerationAction,
  ModerationCategory,
} from './reply-content-moderation.types';

export type ReplyContentModerationFixture = {
  text: string;
  expectedAction: ModerationAction;
  expectedCategories: ModerationCategory[];
};

export const replyContentModerationFixtures: ReplyContentModerationFixture[] = [
  {
    text: '많이 힘들었겠어요.',
    expectedAction: 'allow',
    expectedCategories: [],
  },
  {
    text: '여기까지 말해준 것만으로도 충분해요.',
    expectedAction: 'allow',
    expectedCategories: [],
  },
  {
    text: '그냥 잊어.',
    expectedAction: 'suggest_rewrite',
    expectedCategories: ['unsolicited_solution'],
  },
  {
    text: '너무 예민한 거 아니야?',
    expectedAction: 'suggest_rewrite',
    expectedCategories: ['emotion_dismissal', 'judgmental'],
  },
  {
    text: '요즘 여자들은 다 그래.',
    expectedAction: 'block',
    expectedCategories: ['gender_conflict'],
  },
  {
    text: '카톡 아이디 줘.',
    expectedAction: 'block',
    expectedCategories: ['privacy'],
  },
  {
    text: '제 서비스 한번 써보세요.',
    expectedAction: 'block',
    expectedCategories: ['promotion'],
  },
  {
    text: '약 끊고 그냥 쉬면 괜찮아.',
    expectedAction: 'block',
    expectedCategories: ['high_risk_advice'],
  },
];
