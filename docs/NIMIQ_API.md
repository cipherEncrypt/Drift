# Nimiq Mini App API — Drift reference

Verified in Phase 0 against:

- [Nimiq Provider API](https://nimiq.dev/mini-apps/api-reference/nimiq-provider) (nimiq.dev, fetched Aug 2026)
- `@nimiq/mini-app-sdk@0.1.0` published types (`dist/provider.d.ts`, `dist/index.d.ts`)
- [Eligioo/nimiq-mini-app-demo](https://github.com/Eligioo/nimiq-mini-app-demo) (`master` branch)

SDK package: `@nimiq/mini-app-sdk` (not `@trustwallet/web3-provider-nimiq`).

## Luna conversion

**1 NIM = 100,000 luna** (confirmed in official Nimiq Provider API docs and demo repo comments).

Provider `value` / `fee` parameters are **numbers in luna**, not NIM floats.

## SDK helpers

```typescript
import { init, type InitOptions } from '@nimiq/mini-app-sdk'

interface InitOptions {
  timeout?: number
}

function init(options?: InitOptions): Promise<NimiqProvider>
```

`init()` waits until Nimiq Pay injects `window.nimiq`, or rejects on timeout.

## NimiqProvider — methods Drift uses

### listAccounts

```typescript
listAccounts(): Promise<string[] | ErrorResponse>
```

- Parameters: none
- Returns: user-friendly Nimiq addresses (`NQ…`)
- User confirmation: **yes**
- Errors: `PermissionDeniedError` if user rejects (docs); SDK may return `ErrorResponse`

Official example:

```typescript
const accounts = await nimiq.listAccounts()
```

### sign

```typescript
sign(
  message: string | { message: string; isHex?: boolean }
): Promise<SignatureResult | ErrorResponse>

interface SignatureResult {
  publicKey: string   // hex
  signature: string   // hex
}
```

- User confirmation: **yes**
- Drift claim payload (Phase 1): literal string `claim:<planeId>`

Official example:

```typescript
const signed = await nimiq.sign('hello')
```

### sendBasicTransaction

```typescript
sendBasicTransaction(tx: {
  recipient: string
  value: number              // luna
  fee?: number               // luna, optional
  validityStartHeight?: number
}): Promise<string | ErrorResponse>
```

- Returns: transaction hash (`string`) on success
- User confirmation: **yes**
- Parameter name is **`recipient`** (not `to`)

Official example:

```typescript
const txHash = await nimiq.sendBasicTransaction({
  recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  value: 100000,
  fee: 1000,
  validityStartHeight: 123456,
})
```

### sendBasicTransactionWithData

```typescript
sendBasicTransactionWithData(tx: {
  recipient: string
  value: number              // luna
  fee?: number
  data: string               // required — attached text message
  validityStartHeight?: number
}): Promise<string | ErrorResponse>
```

Official example:

```typescript
const txHash = await nimiq.sendBasicTransactionWithData({
  recipient: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
  value: 100000,
  data: 'mic check',
  fee: 1000,
  validityStartHeight: 123456,
})
```

## ErrorResponse shape (SDK 0.1.0)

Published `@nimiq/mini-app-sdk@0.1.0` returns errors as a **non-discriminated union** on wallet methods:

```typescript
interface ErrorResponse {
  error: {
    type: string
    message: string
  }
}
```

Runtime guard (from demo repo pattern):

```typescript
const result = await nimiq.listAccounts()
if ('error' in result) throw new Error(result.error.message)
const addresses = result // string[]
```

## Methods not used in Drift v1

Documented on nimiq.dev but out of scope: `isConsensusEstablished`, `getBlockNumber`, staking transactions (`sendNewStakerTransaction`, `sendStakeTransaction`, etc.).

## Host context

```typescript
window.nimiqPay?.language          // ISO 639-1, e.g. 'en'
getHostLanguage(): string | undefined
requestDeviceIdentifier({ reason: string }): Promise<string>  // skipped in Drift v1
```
