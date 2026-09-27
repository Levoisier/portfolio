import { describe, expect, it } from 'vitest';
import { hashFor, parseDeepLink } from './deep-link';

const IDS = ['fiora', 'japaniracer', 'gate'];

describe('travel/deep-link: parseDeepLink (hash parsing)', () => {
  it('resolves a known id, with or without the leading #', () => {
    expect(parseDeepLink('#fiora', IDS)).toBe('fiora');
    expect(parseDeepLink('fiora', IDS)).toBe('fiora');
  });

  it('is null for an empty hash', () => {
    expect(parseDeepLink('', IDS)).toBeNull();
    expect(parseDeepLink('#', IDS)).toBeNull();
  });

  it('is null for an id outside the known list', () => {
    expect(parseDeepLink('#bogus', IDS)).toBeNull();
  });

  it('trims incidental whitespace', () => {
    expect(parseDeepLink('  #fiora  ', IDS)).toBe('fiora');
  });

  it('is case-sensitive (canonical ids are already lower-kebab)', () => {
    expect(parseDeepLink('#Fiora', IDS)).toBeNull();
  });
});

describe('travel/deep-link: hashFor', () => {
  it('prefixes the id with #', () => {
    expect(hashFor('fiora')).toBe('#fiora');
  });
});
