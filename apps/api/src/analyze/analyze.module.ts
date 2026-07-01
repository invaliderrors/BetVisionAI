// apps/api/src/analyze/analyze.module.ts
// Composition root for the "analyze any free-text fixture" feature. Imports the infra AnalyzeModule
// (which provides AnalyzeFixtureUseCase wired to the research provider + statistical model + RAG +
// narrator) and exposes POST /api/v1/analyze. The @Global PrismaModule / RedisModule /
// AuthInfraModule / ConfigModule are loaded by AppModule.
import { Module } from '@nestjs/common';
import { AnalyzeModule as InfraAnalyzeModule } from '@betvision/infrastructure';
import { AnalyzeController } from './analyze.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [InfraAnalyzeModule],
  controllers: [AnalyzeController],
  providers: [JwtAuthGuard],
})
export class AnalyzeModule {}
