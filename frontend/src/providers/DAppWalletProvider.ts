import type { WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

export class DAppWalletProvider implements WalletProvider {
  private connectedApi: ConnectedAPI;
  private coinPk: any;
  private encPk: any;

  constructor(connectedApi: ConnectedAPI, coinPk: any, encPk: any) {
    this.connectedApi = connectedApi;
    this.coinPk = coinPk;
    this.encPk = encPk;
  }

  getCoinPublicKey(): any {
    return this.coinPk;
  }

  getEncryptionPublicKey(): any {
    return this.encPk;
  }

  async balanceTx(
    tx: any,
    _ttl?: Date
  ): Promise<any> {
    const txHex = Buffer.from(tx.serialize()).toString('hex');
    const balancedTxObj = await this.connectedApi.balanceUnsealedTransaction(txHex, {
      payFees: true
    });
    
    const balancedTxBytes = Buffer.from(balancedTxObj.tx, 'hex');
    return {
      serialize: () => balancedTxBytes,
    };
  }

  async submitTx(tx: any): Promise<string> {
    const txBytes = tx.serialize();
    const txHex = Buffer.from(txBytes).toString('hex');
    await this.connectedApi.submitTransaction(txHex);
    // ConnectedAPI does not return the transaction hash directly.
    // Return a dummy hash or calculate it if needed.
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
}


