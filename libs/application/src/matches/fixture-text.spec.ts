import { parseFixtureText } from './fixture-text';

describe('parseFixtureText', () => {
  it.each([
    ['Real Madrid vs Barcelona', 'Real Madrid', 'Barcelona'],
    ['Real Madrid vs. Barcelona', 'Real Madrid', 'Barcelona'],
    ['Real Madrid v Barcelona', 'Real Madrid', 'Barcelona'],
    ['Arsenal - Chelsea', 'Arsenal', 'Chelsea'],
    ['Arsenal x Chelsea', 'Arsenal', 'Chelsea'],
    ['Bayern – Dortmund', 'Bayern', 'Dortmund'],
  ])('splits "%s" into two sides', (input, home, away) => {
    expect(parseFixtureText(input)).toEqual({ home, away });
  });

  it('collapses extra whitespace on each side', () => {
    expect(parseFixtureText('  Real   Madrid   vs   Barcelona  ')).toEqual({
      home: 'Real Madrid',
      away: 'Barcelona',
    });
  });

  it('keeps intra-name hyphens (only whitespace-delimited separators split)', () => {
    expect(parseFixtureText('Saint-Étienne vs Lyon')).toEqual({
      home: 'Saint-Étienne',
      away: 'Lyon',
    });
  });

  it('returns a single side (away = null) when there is no separator', () => {
    expect(parseFixtureText('Barcelona')).toEqual({ home: 'Barcelona', away: null });
  });

  it('returns null for a blank query', () => {
    expect(parseFixtureText('   ')).toBeNull();
    expect(parseFixtureText('')).toBeNull();
  });
});
