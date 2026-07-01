// apps/api/src/predictions/predictions.module.ts
// Composition root for the predictions feature. Imports the infra PredictionsModule (which provides
// RunPrediction/DetectValueBets/GetPrediction wired to the Prisma repositories + statistical model)
// and DevProvidersModule (@Global synthetic SPORTS_DATA/TEAM_STATS/ODDS providers behind the
// feature pipeline). The @Global PrismaModule / RedisModule / AuthInfraModule (ID_GENERATOR) are
// loaded by AppModule.
import { Module } from '@nestjs/common';
import { PredictionsModule as InfraPredictionsModule, DevProvidersModule } from '@betvision/infrastructure';
import { PredictionsController } from './predictions.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [InfraPredictionsModule, DevProvidersModule],
  controllers: [PredictionsController],
  providers: [JwtAuthGuard],
})
export class PredictionsModule {}
