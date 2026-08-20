import { ZKConfigProvider } from '@midnight-ntwrk/midnight-js-types';
import type { ZKIR, ProverKey, VerifierKey } from '@midnight-ntwrk/midnight-js-types';

export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  private resolveFile(circuitId: string, ext: string): string {
    const name = circuitId.includes('#') ? circuitId.split('#')[1] : circuitId;
    return `${this.baseUrl}/${name}.${ext}`;
  }

  async getZKIR(circuitId: K): Promise<ZKIR> {
    const url = this.resolveFile(circuitId, 'bzkir');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ZKIR for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as ZKIR;
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const url = this.resolveFile(circuitId, 'prover');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch prover key for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as ProverKey;
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const url = this.resolveFile(circuitId, 'verifier');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch verifier key for ${circuitId}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer) as any as VerifierKey;
  }
}

