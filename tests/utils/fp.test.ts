import { describe, expect, it } from 'vitest';
import { pipe } from '../../src/utils/fp';

describe('fp', () => {
  describe('pipe', () => {
    it('should return value as-is when no functions provided', () => {
      const result = pipe<number>()(5);
      expect(result).toBe(5);
    });

    it('should apply single function', () => {
      const addOne = (x: number) => x + 1;
      const result = pipe(addOne)(5);
      expect(result).toBe(6);
    });

    it('should compose multiple functions left to right', () => {
      const addOne = (x: number) => x + 1;
      const double = (x: number) => x * 2;
      const square = (x: number) => x * x;

      const result = pipe(addOne, double, square)(2);
      // (2 + 1) = 3 -> 3 * 2 = 6 -> 6 * 6 = 36
      expect(result).toBe(36);
    });

    it('should work with string transformations', () => {
      const trim = (s: string) => s.trim();
      const toUpper = (s: string) => s.toUpperCase();
      const addExclamation = (s: string) => `${s}!`;

      const result = pipe(trim, toUpper, addExclamation)('  hello  ');
      expect(result).toBe('HELLO!');
    });

    it('should work with object transformations', () => {
      type User = { name: string; age: number };

      const setName = (u: User): User => ({ ...u, name: 'John' });
      const incrementAge = (u: User): User => ({ ...u, age: u.age + 1 });

      const result = pipe(setName, incrementAge)({ name: 'Jane', age: 25 });
      expect(result).toEqual({ name: 'John', age: 26 });
    });
  });
});
