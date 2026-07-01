// libs/domain/src/ports/weather-provider.port.ts
import type { Provenanced, IsoDateTime } from './shared.dto';

export interface WeatherDto {
  readonly venue: string;
  readonly kickoffUtc: IsoDateTime;
  readonly tempC: number;
  readonly windKph: number;
  readonly precipitationMm: number;
  readonly condition: string;
}

export interface WeatherProviderPort {
  getForecast(venue: string, kickoffUtc: IsoDateTime): Promise<Provenanced<WeatherDto>>;
}
