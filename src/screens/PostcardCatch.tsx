import { useEffect, useState } from 'react'
import { claimPlane, getConfig } from '../lib/api'
import { useProfiles } from '../context/ProfileContext'
import UserLabel from '../components/UserLabel'
import { lunaToNim } from '../lib/luna'
import { normalizeAddress } from '../lib/profiles'
import { signClaim } from '../lib/nimiq'
import type { PublicPlane } from '../types/plane'

interface Props {
  plane: PublicPlane
  walletAddress: string
  onClose: () => void
  onCaught: (plane: PublicPlane) => void
}

export default function PostcardCatch({
  plane,
  walletAddress,
  onClose,
  onCaught,
}: Props) {
  const { loadAddresses } = useProfiles()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [catchEnabled, setCatchEnabled] = useState(false)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [caught, setCaught] = useState<{
    amountLuna: string
    payoutTxHash: string
  } | null>(null)

  useEffect(() => {
    loadAddresses([plane.fromAddress, plane.toAddress].filter(Boolean) as string[])
  }, [plane.fromAddress, plane.toAddress, loadAddresses])

  useEffect(() => {
    getConfig()
      .then((cfg) => setCatchEnabled(cfg.postcardCatchEnabled))
      .catch(() => setCatchEnabled(false))
      .finally(() => setConfigLoaded(true))
  }, [])

  const isCaught = plane.status === 'caught' || caught !== null
  const isWinner =
    caught !== null ||
    (plane.status === 'caught' &&
      plane.toAddress &&
      normalizeAddress(plane.toAddress) === normalizeAddress(walletAddress))

  async function onCatch() {
    setBusy(true)
    setError(null)

    try {
      const sig = await signClaim(plane.id)
      const result = await claimPlane(plane.id, {
        claimantAddress: walletAddress,
        signature: sig.signature,
        publicKey: sig.publicKey,
      })

      if ('caught' in result && result.caught) {
        setCaught({
          amountLuna: result.amountLuna,
          payoutTxHash: result.payoutTxHash,
        })
        onCaught(
          { ...plane, status: 'caught', toAddress: walletAddress, payoutTxHash: result.payoutTxHash },
        )
      } else {
        setError('catch failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'catch failed')
    } finally {
      setBusy(false)
    }
  }

  const displayAmount = caught?.amountLuna ?? plane.amountLuna
  const payoutHash = caught?.payoutTxHash ?? plane.payoutTxHash

  return (
    <section className="card card-elevated postcard-catch">
      <div className="row-head">
        <div>
          <p className="eyebrow eyebrow-postcard">Public</p>
          <h2 className="screen-title">Postcard</h2>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="postcard-banner">Anyone can catch this</p>

      <dl className="meta-grid claim-meta">
        <div>
          <dt>Amount</dt>
          <dd className="claim-total">{lunaToNim(displayAmount)} NIM</dd>
        </div>
        <div>
          <dt>From</dt>
          <dd><UserLabel address={plane.fromAddress} /></dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{isCaught ? 'caught' : plane.status}</dd>
        </div>
        {isCaught && plane.toAddress && (
          <div>
            <dt>Caught by</dt>
            <dd><UserLabel address={plane.toAddress} /></dd>
          </div>
        )}
      </dl>

      {isWinner && payoutHash ? (
        <div className="note-box note-box-reveal postcard-win">
          <p className="label">You caught it</p>
          <p className="hint small-hint">Payout sent on-chain.</p>
          <p className="tx-hash">{payoutHash}</p>
        </div>
      ) : isCaught ? (
        <p className="status">Someone else caught this postcard.</p>
      ) : plane.status === 'in_flight' ? (
        <>
          {configLoaded && !catchEnabled ? (
            <p className="status">Catch payouts are not configured yet.</p>
          ) : (
            <>
              <p className="hint">
                First valid signed catch wins the NIM. Sign in Nimiq Pay to claim.
              </p>
              {error && <p className="error">{error}</p>}
              <button
                type="button"
                className="btn-postcard-solid"
                onClick={onCatch}
                disabled={busy || !configLoaded}
              >
                {busy ? 'Signing…' : 'Catch postcard'}
              </button>
            </>
          )}
        </>
      ) : (
        <p className="status">This postcard is no longer available.</p>
      )}
    </section>
  )
}
