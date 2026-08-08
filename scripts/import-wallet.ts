import * as fs from 'node:fs';
import * as readline from 'node:readline';
import * as bip39 from 'bip39';
import { HDWallet, Roles, createKeystore } from '@midnight-ntwrk/wallet-sdk';
import { Buffer } from 'buffer';
import { STATE_FILE_NAME, STATE_VERSION, type NetworkState } from '../src/network';

const EXPECTED_ADDRESS = 'mn_addr_preview13atlp063v69x7d0djz7rhvgd23lv7xd57jdzwz6rlrrzya0tg24qlfhvfh';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('\nEnter your 24-word recovery phrase (separated by spaces):\n> ', (mnemonic) => {
  rl.close();
  
  const trimmed = mnemonic.trim().replace(/\s+/g, ' ');
  const words = trimmed.split(' ');
  if (words.length !== 24) {
    console.error(`\n❌ Error: Expected 24 words, but got ${words.length}.`);
    process.exit(1);
  }

  if (!bip39.validateMnemonic(trimmed)) {
    console.error('\n❌ Error: Invalid mnemonic phrase (checksum failed).');
    process.exit(1);
  }

  console.log('\nDeriving keys from mnemonic...');
  
  // Use mnemonicToEntropy to get the 32-byte seed directly (matching Midnight extension key derivation)
  const seed32 = bip39.mnemonicToEntropy(trimmed);

  // Derive the wallet key to verify the address
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed32, 'hex'));
  if (hdWallet.type !== 'seedOk') {
    console.error('\n❌ Error: Invalid seed.');
    process.exit(1);
  }

  // Derive keys using the same role configuration as the updated SDK's wallet setup
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.NightExternal])
    .deriveKeysAt(0);

  if (result.type !== 'keysDerived') {
    console.error('\n❌ Error: Key derivation failed.');
    process.exit(1);
  }

  const keys = result.keys;
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], 'preview');
  const derivedAddress = unshieldedKeystore.getBech32Address().toString();

  console.log(`Derived Address: ${derivedAddress}`);

  if (derivedAddress !== EXPECTED_ADDRESS) {
    console.error(`\n❌ Error: The derived address does not match your expected funded address!\nExpected: ${EXPECTED_ADDRESS}\nDerived:  ${derivedAddress}`);
    process.exit(1);
  }

  console.log('\n✓ Address matches! Writing seed to .midnight-state.json...');

  const stateFile = STATE_FILE_NAME;
  let state: NetworkState;

  if (fs.existsSync(stateFile)) {
    try {
      state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch {
      state = {
        version: STATE_VERSION,
        activeNetwork: 'preview',
        wallets: {},
        deployments: {},
      };
    }
  } else {
    state = {
      version: STATE_VERSION,
      activeNetwork: 'preview',
      wallets: {},
      deployments: {},
    };
  }

  state.activeNetwork = 'preview';
  state.wallets = {
    ...state.wallets,
    preview: {
      seed: seed32,
      createdAt: new Date().toISOString(),
    },
  };

  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
  console.log('✓ Success! Your funded wallet is now configured for preview network deployment.\n');
});
