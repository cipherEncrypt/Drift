export type PlaneMode = 'private' | 'postcard'

export type PlaneStatus =
  | 'created'
  | 'in_flight'
  | 'landed'
  | 'opened'
  | 'caught'
  | 'tx_rejected'

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
  createdAt: string
}
