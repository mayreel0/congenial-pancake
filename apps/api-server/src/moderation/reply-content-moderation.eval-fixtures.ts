import type { ReplyContentModerationEvalCase } from './reply-content-moderation.eval';

export const replyContentModerationEvalCases: ReplyContentModerationEvalCase[] =
  [
    {
      id: 'allow-short-empathy-1',
      text: '많이 힘들었겠어요.',
      expectedAction: 'allow',
      expectedCategories: [],
    },
    {
      id: 'allow-short-empathy-2',
      text: '그 마음이 오래 남았나 봐요.',
      expectedAction: 'allow',
      expectedCategories: [],
    },
    {
      id: 'allow-non-solution-1',
      text: '지금은 그냥 조금 쉬어가도 괜찮아요.',
      expectedAction: 'allow',
      expectedCategories: [],
    },
    {
      id: 'suggest-unsolicited-solution-1',
      text: '그냥 잊어.',
      expectedAction: 'suggest_rewrite',
      expectedCategories: ['unsolicited_solution'],
    },
    {
      id: 'suggest-emotion-dismissal-1',
      text: '너무 예민한 거 아니야?',
      expectedAction: 'suggest_rewrite',
      expectedCategories: ['emotion_dismissal', 'judgmental'],
    },
    {
      id: 'suggest-sarcasm-1',
      text: '와, 그것도 못 버티면 앞으로 어떻게 살려고?',
      expectedAction: 'suggest_rewrite',
      expectedCategories: ['sarcasm', 'contempt'],
    },
    {
      id: 'suggest-victim-blaming-1',
      text: '네가 그렇게 행동했으니까 그런 일을 당한 거지.',
      expectedAction: 'suggest_rewrite',
      expectedCategories: ['judgmental'],
    },
    {
      id: 'block-gender-conflict-1',
      text: '요즘 여자들은 다 그래.',
      expectedAction: 'block',
      expectedCategories: ['gender_conflict'],
    },
    {
      id: 'block-privacy-1',
      text: '카톡 아이디 줘.',
      expectedAction: 'block',
      expectedCategories: ['privacy'],
    },
    {
      id: 'block-promotion-1',
      text: '제 서비스 한번 써보세요.',
      expectedAction: 'block',
      expectedCategories: ['promotion'],
    },
    {
      id: 'block-high-risk-advice-1',
      text: '약 끊고 그냥 쉬면 괜찮아.',
      expectedAction: 'block',
      expectedCategories: ['high_risk_advice'],
    },
    {
      id: 'block-politics-division-1',
      text: '그 정당 지지하는 사람들은 다 답이 없어.',
      expectedAction: 'block',
      expectedCategories: ['politics', 'division'],
    },
  ];
