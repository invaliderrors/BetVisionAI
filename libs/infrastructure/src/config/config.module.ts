// libs/infrastructure/src/config/config.module.ts
// Thin Nest wrapper around the framework-light `loadConfig()` from @betvision/config.
// Both apps (api + worker) import this so env is validated ONCE, fail-fast, at boot.
import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, loadConfig } from '@betvision/config';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => loadConfig(),
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
