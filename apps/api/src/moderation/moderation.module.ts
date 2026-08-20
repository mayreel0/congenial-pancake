import { Module } from '@nestjs/common';

// Auto-hide-at-3-distinct-reporters provider lands with the reporting feature PR
// (see docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md).
@Module({})
export class ModerationModule {}
