export type PlaneMode = 'private' | 'postcard'

export type PlaneStatus =
  | 'created'
  | 'in_flight'
  | 'landed'
  | 'opened'
  | 'caught'
  | 'tx_rejected'

export interface PlaneRow {
  id: string
  mode: PlaneMode
  from_address: string
  to_address: string | null
  amount_luna: string
  note: string | null
  tx_hash: string
  status: PlaneStatus
  launched_at: string
  arrives_at: string
  from_lat: number
  from_lng: number
  to_lat: number | null
  to_lng: number | null
  payout_tx_hash: string | null
  created_at: string
}

export interface PublicPlane {
  id: string
  mode: PlaneMode
  fromAddress: string
  toAddress: string | null
  amountLuna: string
  txHash: string
  status: PlaneStatus
  launchedAt: string
  arrivesAt: string
  fromLatLng: [number, number]
  toLatLng: [number, number] | null
  payoutTxHash: string | null
  createdAt: string
}

export interface Cheer {
  id: string
  planeId: string
  fromAddress: string
  amountLuna: string
  txHash: string
  word: string | null
  createdAt: string
}

export interface Relay {
  id: string
  planeId: string
  fromAddress: string
  amountLuna: string
  txHash: string
  timeSavedMs: number
  createdAt: string
}

export interface InboxPlane extends PublicPlane {
  cheerTotalLuna: string
  totalLuna: string
}
