import { useEffect, useState } from 'react';
import { listVerificationQueue, getVerificationDetail, markDocument, approveWorker, rejectWorker } from '../api/resources';
import { ApiError } from '../api/client';
import { useToast } from '../components/ui/Toast';
import './Verification.css';

interface QueueWorker {
  _id: string;
  firstName: string;
  lastName: string;
  role: string;
  suburb: string;
  verificationStatus: string;
  clearances: { name: string; status: string; expiry?: string }[];
}

const REJECT_REASONS = [
  'Document is not legible',
  'Name does not match the account',
  'Certificate has already expired',
  'Wrong document type supplied',
  'Issuing body could not be confirmed',
];

export default function Verification() {
  const [queue, setQueue] = useState<QueueWorker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ worker: QueueWorker; trail: any[] } | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const showToast = useToast();

  useEffect(() => {
    listVerificationQueue().then((res: any) => {
      setQueue(res);
      if (res[0]) setSelectedId(res[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    getVerificationDetail(selectedId).then((res: any) => setDetail(res));
  }, [selectedId]);

  async function toggleMark(docIndex: number, mark: 'verified' | 'flagged') {
    if (!selectedId) return;
    await markDocument(selectedId, docIndex, mark);
    const refreshed: any = await getVerificationDetail(selectedId);
    setDetail(refreshed);
  }

  async function approve() {
    if (!selectedId) return;
    setError('');
    try {
      await approveWorker(selectedId);
      showToast('Worker approved and published.');
      setQueue((q) => q.filter((w) => w._id !== selectedId));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve this worker.');
    }
  }

  async function reject() {
    if (!selectedId) return;
    setError('');
    try {
      await rejectWorker(selectedId, reason, note);
      showToast('Worker sent back for correction.');
      setQueue((q) => q.filter((w) => w._id !== selectedId));
      setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reject this worker.');
    }
  }

  return (
    <div className="verification-page">
      <aside className="verify-rail">
        {queue.length === 0 ? (
          <div className="verify-empty">Nothing in the queue right now.</div>
        ) : (
          <div className="verify-queue-list">
            {queue.map((w) => (
              <button
                key={w._id}
                className={`verify-queue-card ${selectedId === w._id ? 'verify-queue-card-selected' : ''}`}
                onClick={() => setSelectedId(w._id)}
              >
                <p className="verify-queue-name">{w.firstName} {w.lastName}</p>
                <p className="verify-queue-meta">{w.role} · {w.suburb}</p>
              </button>
            ))}
          </div>
        )}
      </aside>

      {detail && (
        <div className="verify-detail">
          <div className="verify-detail-header">
            <span className="verify-avatar">{detail.worker.firstName[0]}{detail.worker.lastName[0]}</span>
            <div>
              <h1 className="verify-detail-name">{detail.worker.firstName} {detail.worker.lastName}</h1>
              <p className="verify-detail-meta">{detail.worker.role} · {detail.worker.suburb}</p>
            </div>
          </div>

          <div className="verify-docs">
            {detail.worker.clearances.map((doc, i) => (
              <div key={i} className="verify-doc-row">
                <div className="verify-doc-info">
                  <p className="verify-doc-name">{doc.name}</p>
                </div>
                <div className="verify-doc-toggles">
                  <button
                    className={`verify-toggle verify-toggle-verify ${doc.status === 'verified' ? 'verify-toggle-active' : ''}`}
                    onClick={() => toggleMark(i, 'verified')}
                  >
                    Verified
                  </button>
                  <button
                    className={`verify-toggle verify-toggle-flag ${doc.status === 'flagged' ? 'verify-toggle-active' : ''}`}
                    onClick={() => toggleMark(i, 'flagged')}
                  >
                    Flag
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="verify-decision">
            <h2 className="verify-decision-title">Decision</h2>
            <div className="verify-reject-chips">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  className={`verify-reason-chip ${reason === r ? 'verify-reason-chip-selected' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea className="verify-note" placeholder="What they need to change" value={note} onChange={(e) => setNote(e.target.value)} />

            {error && (
              <p className="verify-decision-error" role="alert">
                {error}
              </p>
            )}

            <div className="verify-decision-actions">
              <button className="verify-approve-btn" onClick={approve}>Approve and publish →</button>
              <button className="verify-reject-btn" onClick={reject}>Send back for correction</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
