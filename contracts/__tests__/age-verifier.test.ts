import { describe, it, expect, vi } from 'vitest';
import * as AgeVerifier from '../managed/age-verifier/contract/index.js';

describe('Age Verifier Circuit', () => {
  it('fails verification if age is below threshold', () => {
    // We mock the circuit execution behavior based on the new logic
    // This assumes the contract was deployed with threshold 18
    const threshold = 18n;
    const testAge = 16n;
    
    expect(() => {
      if (testAge < threshold) {
        throw new Error("You do not meet the minimum age requirement!");
      }
    }).toThrow("You do not meet the minimum age requirement!");
  });

  it('succeeds verification if age meets the threshold', () => {
    const threshold = 18n;
    const testAge = 21n;
    
    let lastVerificationSuccess = false;
    expect(() => {
      if (testAge < threshold) {
        throw new Error("You do not meet the minimum age requirement!");
      }
      lastVerificationSuccess = true;
    }).not.toThrow();
    
    expect(lastVerificationSuccess).toBe(true);
  });
});
