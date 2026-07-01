// apps/api/src/reports/reports.module.ts
// Composition root for the AI-reports feature. Imports the infra ReportsModule (which provides
// GenerateReport/GetReport wired to the Prisma repos + the LLM_MODE-bound narrator + dev RAG) and
// DevProvidersModule (the @Global synthetic providers behind the feature pipeline, needed because
// the infra ReportsModule pulls in the prediction/feature graph). The @Global PrismaModule /
// RedisModule / AuthInfraModule are loaded by AppModule.
import { Module } from '@nestjs/common';
import {
  ReportsModule as InfraReportsModule,
  DevProvidersModule,
} from '@betvision/infrastructure';
import { ReportsController } from './reports.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [InfraReportsModule, DevProvidersModule],
  controllers: [ReportsController],
  providers: [JwtAuthGuard],
})
export class ReportsModule {}
