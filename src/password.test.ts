import { describe, expect, it } from 'vitest';
import { createEstimator, dictionaries } from './password';

describe('offline password estimator', () => {
  it('recognises common passwords and distinguishes a stronger password', () => {
    const estimator = createEstimator(['common', 'en', 'fr']);
    expect(estimator.check('password').score).toBe(0);
    expect(estimator.check('vJ9!qR2#xL7@wT4$').score).toBeGreaterThan(2);
  });

  it.each(['en', 'fr'] as const)('adds and removes the %s dictionary', language => {
    const key = `commonWords-${language}`;
    const word = (dictionaries[language] as Record<string, string[]>)[key].find(word => word.length >= 8)!;
    const enabled = createEstimator([language]).check(word);
    expect(enabled.sequence.some(match => match.pattern === 'dictionary' && match.dictionaryName === key)).toBe(true);
    const disabled = createEstimator([]).check(word);
    expect(disabled.sequence.some(match => match.pattern === 'dictionary' && match.dictionaryName === key)).toBe(false);
    expect(enabled.guesses).toBeLessThan(disabled.guesses);
  });

  it('uses personal words only for the current check', () => {
    const estimator = createEstimator(['common', 'en', 'fr']);
    const password = 'zelvarionkestrel';
    const baseline = estimator.check(password).guesses;
    expect(estimator.check(password, [password]).guesses).toBeLessThan(baseline);
    expect(estimator.check(password).guesses).toBe(baseline);
  });

  it('checks keyboard patterns even without dictionaries', () => {
    expect(createEstimator([]).check('qwerty').sequence.some(match => match.pattern === 'spatial')).toBe(true);
  });
});
