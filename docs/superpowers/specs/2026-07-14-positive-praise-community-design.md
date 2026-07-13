# Positive Praise Community Design

## Overview

This service is a praise-first community for people who want to share something they did, endured, tried, or feel proud of, and receive unconditional positive responses in a safe environment.

The MVP combines a public feed with post-specific real-time praise rooms. Users discover posts from the feed, open a post, and participate in a focused comment space where the author can receive praise from both people and AI. The author can then respond with quick gratitude reactions or short thank-you replies.

The product is intentionally not a debate forum, advice forum, or performance-ranking community. Its core promise is simple: when someone asks to be praised, the space protects that request.

## Product Principles

- Writing and responding require an authenticated account.
- Users may display posts and comments with either their nickname or an anonymous label.
- Anonymous display never means anonymous to the system. Moderation, reporting, trust scoring, and sanctions remain tied to the authenticated account.
- AI should provide initial warmth and prevent silence, not pretend to be human or dominate the community.
- Harmful comments should usually be hidden or held quietly rather than visibly blocked, so malicious users do not learn how to bypass filters.
- Ranking should reward warmth and useful participation, not volume or popularity alone.

## MVP Scope

The MVP includes:

- Login and sign-up.
- Nickname or anonymous display selection for posts and comments.
- Praise-request post creation.
- Free-form writing with optional prompt assistance.
- Home feed.
- Post detail page as a real-time praise room.
- Initial AI praise comments after post creation.
- Additional AI praise comments when human comments are insufficient.
- Human praise comments.
- Author gratitude reactions on comments.
- Author short thank-you replies on comments.
- Reporting.
- Hidden or held moderation states.
- Trust-score-based sanctions.
- Ranking page.
- User activity page.
- Minimal moderator review screen for held content and reports.

The MVP excludes:

- Direct messages, friends, and follows.
- Image or video uploads.
- Advanced profile customization.
- Payments.
- Advanced admin dashboard features.
- Native mobile apps.
- Fully real-time home feed.
- Groups, channels, or tag communities.
- Public APIs.
- Multi-language support.
- AI voice responses or text-to-speech.

## Core Screens

### Login and Sign-Up

Users must authenticate before writing posts, comments, reactions, replies, or reports. For the MVP, reading the home feed and post detail pages is public so new visitors can understand the community before signing up.

### Home Feed

The feed shows praise-request posts. Each item includes title, short body preview, comment count, rough AI/human activity state, and recent activity time.

The feed should include posts that need support, not only posts that are already popular. A "needs encouragement" signal can prioritize posts with few human comments or low recent activity.

### Post Creation

Post creation supports free-form writing and optional prompts:

- What did I accomplish today?
- What do I want to be praised for?
- What tone of praise would feel good?

The author chooses whether the post appears under their nickname or anonymously.

### Post Detail / Praise Room

Each post detail page behaves like a small real-time room. New comments, author reactions, author replies, and moderation changes update without requiring a page refresh.

AI comments are clearly labeled as AI. Human comments show either nickname or anonymous display according to the comment author's choice.

Only the post author can add gratitude reactions or thank-you replies to comments on that post.

### Ranking

The ranking page has two primary views:

- Warm praiser ranking: highlights users who receive gratitude reactions, avoid reports, and participate consistently.
- Posts needing encouragement: highlights posts with low human response or little recent activity.

Ranking must avoid rewarding raw comment volume alone. The score should combine positive reactions, low report rate, moderation history, and participation consistency.

### My Activity

The user activity page shows:

- Posts I wrote.
- Praise comments I wrote.
- Reactions and replies I received.
- Current account trust or restriction state.
- My comments currently under review, without exposing filter-bypass hints.

### Minimal Moderator Review

The MVP includes a small internal review screen for held comments, reports, and sanction decisions. It does not need advanced analytics, bulk workflows, or complex audit search in the first version.

## Data Model

### User

Represents an authenticated account.

Key fields:

- id
- nickname
- trustScore
- sanctionState
- createdAt
- updatedAt

### PraisePost

Represents a request for praise.

Key fields:

- id
- authorUserId
- displayMode: nickname or anonymous
- title
- body
- promptAnswers
- status
- createdAt
- updatedAt

### PraiseComment

Represents a praise comment from a human or AI.

Key fields:

- id
- postId
- authorUserId, nullable for AI
- isAiGenerated
- displayMode
- body
- visibilityState: visible, held, hidden, authorOnly
- moderationRisk
- createdAt
- updatedAt

### Reaction

Represents a quick gratitude reaction from the post author to a comment.

Key fields:

- id
- postId
- commentId
- authorUserId
- type: thankYou, helpedMe, movedMe
- createdAt

### Reply

Represents a short thank-you reply from the post author to a comment.

Key fields:

- id
- postId
- commentId
- authorUserId
- body
- visibilityState
- createdAt

### Report

Represents a user report against a post, comment, reply, or account.

Key fields:

- id
- reporterUserId
- targetType
- targetId
- reason
- status
- createdAt

### ModerationEvent

Records filtering, report handling, trust score changes, and sanctions.

Key fields:

- id
- userId
- targetType
- targetId
- eventType
- riskReason
- trustScoreDelta
- createdAt

### AiPraiseJob

Represents a pending or completed AI praise-generation task.

Key fields:

- id
- postId
- jobType: initialPraise or inactivityPraise
- scheduledAt
- status
- resultCommentIds
- createdAt
- updatedAt

### RankingSnapshot

Stores computed ranking results.

Key fields:

- id
- rankingType
- period
- entries
- computedAt

## Real-Time Behavior

Real-time behavior is focused on post detail pages. The following events should update live:

- New visible comments.
- Author gratitude reactions.
- Author thank-you replies.
- Comment visibility changes caused by moderation.

Home feed and ranking do not need full real-time behavior in the MVP. They may refresh periodically, on page focus, or on navigation.

## AI Praise Policy

When a post is created, the system schedules an initial AI praise job. That job creates 1 to 3 comments.

AI praise should:

- Reflect specific details from the post.
- Praise effort, courage, persistence, care, learning, or completion.
- Avoid exaggerated praise such as "you are perfect."
- Avoid professional advice in medical, legal, financial, or similarly sensitive domains.
- Avoid evaluative comments about body, appearance, identity, or other sensitive traits.
- Respect the requested tone only when it remains safe and kind.
- Be clearly labeled as AI.

If human comments are insufficient after a delay, the system may schedule additional AI praise. Example triggers:

- No human comments 10 minutes after post creation.
- No new human comments for 30 minutes.

The system should cap AI comments per post so AI does not outnumber or overwhelm human participation.

If a post includes self-harm, violence, abuse, or severe crisis signals, the AI praise flow should not generate ordinary praise. It should switch to a crisis-aware help or reporting flow.

## Moderation and Sanctions

Comments and replies are checked when submitted. Low-risk content becomes visible. Higher-risk content may be held, hidden, or shown only to the commenter while remaining invisible to the post author and general users.

This quiet handling is intentional. Visible hard-blocking can turn moderation into a bypass challenge for malicious users.

Moderation should pay special attention to:

- Praise disguised as mockery.
- Comparisons that put the author down.
- Unwanted advice.
- Comments about appearance, body, identity, or sensitive traits.
- Self-promotion.
- Harassment, threats, hate, sexual content, or spam.

Reports create moderation events and influence user trust score. Recent behavior should weigh more than old behavior so users can recover from isolated mistakes, while repeated harmful behavior escalates quickly.

Sanction states:

- Normal: comments are usually visible immediately.
- Low trust: comments are more likely to be held and ranking impact is reduced.
- Shadow banned: activity appears normal to the user but is hidden or heavily limited for others.
- Service banned: writing actions are blocked, and severe cases may restrict account access.

## Technical Architecture

Recommended MVP stack:

- Full-stack web framework such as Next.js.
- PostgreSQL database.
- Channel-based real-time updates for post detail pages.
- Background job queue for AI comments, delayed praise jobs, ranking snapshots, and moderation follow-ups.
- Server-side AI integration only.
- Authentication via email and/or social login.
- Moderation combining rule-based checks and AI classification.

AI prompts, AI responses, moderation decisions, and trust score changes should be logged enough to support audit and policy improvement, while respecting user privacy.

## Testing Strategy

Priority test cases:

- Unauthenticated users cannot write posts, comments, reactions, replies, or reports.
- Anonymous display still preserves internal account linkage.
- A new post schedules initial AI praise.
- Initial AI praise creates 1 to 3 clearly labeled AI comments.
- Additional AI praise is skipped when enough human comments exist.
- A risky comment is hidden from the post author and general users.
- A held or hidden comment does not reveal useful bypass details to the commenter.
- Reports create moderation events.
- Moderation and reports affect trust score.
- Low-trust users have reduced ranking impact.
- Shadow-banned users see their own activity while others do not.
- Only the post author can react to or reply to comments on their post.
- Real-time post detail updates propagate comments, reactions, replies, and visibility changes.
- Ranking does not reward raw comment count alone.

## Open Implementation Choices

These choices can be decided during implementation planning:

- Whether anonymous display uses per-post aliases or a simple "anonymous" label.
- Exact thresholds for AI inactivity praise.
- Exact trust score formula and recovery curve.

## Success Criteria

The MVP succeeds if:

- A user can create a praise-request post and quickly receive at least one warm response.
- Human users can add praise in real time.
- The post author can easily express gratitude.
- Harmful or sarcastic content is kept away from the author.
- AI participation makes quiet moments feel less empty without making the community feel fake.
- Ranking encourages supportive behavior instead of competition or spam.
