// libs/testing/src/fakes/fake-weather-provider.ts
import type { WeatherProviderPort, WeatherDto, Provenanced, IsoDateTime } from '@betvision/domain';
import { provenanced } from './provenance';

const PROVIDER = 'fake-weather';

export class FakeWeatherProvider implements WeatherProviderPort {
  private forecast: WeatherDto | null = null;

  seed(forecast: WeatherDto): this {
    this.forecast = forecast;
    return this;
  }

  async getForecast(venue: string, kickoffUtc: IsoDateTime): Promise<Provenanced<WeatherDto>> {
    const dto: WeatherDto = this.forecast ?? {
      venue,
      kickoffUtc,
      tempC: 14,
      windKph: 12,
      precipitationMm: 0,
      condition: 'clear',
    };
    return provenanced(PROVIDER, dto);
  }
}
