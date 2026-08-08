import { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import type { ZKIR, ProverKey, VerifierKey } from '@midnight-ntwrk/midnight-js-types';

export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  async getZKIR(circuitId: K): Promise<ZKIR> {
    const response = await fetch(`${this.baseUrl}/${circuitId}.bzkir`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ZKIR for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as ZKIR;
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const response = await fetch(`${this.baseUrl}/${circuitId}.prover`);
    if (!response.ok) {
      throw new Error(`Failed to fetch prover key for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as ProverKey;
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const response = await fetch(`${this.baseUrl}/${circuitId}.verifier`);
    if (!response.ok) {
      throw new Error(`Failed to fetch verifier key for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as VerifierKey;
  }
}

