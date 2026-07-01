// libs/infrastructure/src/prisma/prisma.service.ts
// Single, shared PrismaClient wired into the Nest lifecycle: it opens the pool on
// module init and closes it on shutdown (api/worker call enableShutdownHooks()).
// The generated Prisma client is consumed ONLY inside libs/infrastructure — it never
// crosses the module boundary (repositories map rows -> domain entities/VOs).
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Prisma connected to Postgres');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from Postgres');
  }
}
