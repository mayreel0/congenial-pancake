import { Module } from '@nestjs/common';

// Whitelist guard + "신고 검토" controller land with the admin feature PR
// (see docs/decisions/2026-08-21-onseol-db-and-moderation-decisions.md).
@Module({})
export class AdminModule {}
