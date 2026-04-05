import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  getPatients, getTrackingItems, addTrackingItem, deleteTrackingItem,
  getSOAP, addSOAP, calcAge, today, formatTime,
} from '../../lib/api';

export default function PatientDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [patient, setPatient] = useState(null);
  const [trackingItems, setTrackingItems] = useState([]);
  const [soapEntries, setSoapEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(today());

  // Tracking form
  const [newTracking, setNewTracking] = useState('');
  const [showTrackingInput, setShowTrackingInput] = useState(false);

  // SOAP form
  const [showSoapForm, setShowSoapForm] = useState(false);
  const [soapForm, setSoapForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [savingSoap, setSavingSoap] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);

  useEffect(() => {
    if (id) load();
  }, [id, viewDate]);

  async function load() {
    setLoading(true);
    const [patients, items, soap] = await Promise.all([
      getPatients(),
      getTrackingItems(id),
      getSOAP(id, viewDate),
    ]);
    const p = Array.isArray(patients) ? patients.find(x => x.patient_id === id) : null;
    setPatient(p);
    setTrackingItems(Array.isArray(items) ? items : []);
    setSoapEntries(Array.isArray(soap) ? soap : []);
    setLoading(false);
  }

  async function handleAddTracking() {
    if (!newTracking.trim()) return;
    setSavingTracking(true);
    await addTrackingItem(id, newTracking.trim());
    setNewTracking('');
    setShowTrackingInput(false);
    setSavingTracking(false);
    await load();
  }

  async function handleDeleteTracking(item_id) {
    await deleteTrackingItem(item_id);
    await load();
  }

  async function handleSaveSOAP() {
    const hasContent = Object.values(soapForm).some(v => v.trim());
    if (!hasContent) return;
    setSavingSoap(true);
    await addSOAP({ patient_id: id, date: viewDate, ...soapForm });
    setSoapForm({ subjective: '', objective: '', assessment: '', plan: '' });
    setShowSoapForm(false);
    setSavingSoap(false);
    await load();
  }

  function goDay(offset) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + offset);
    setViewDate(d.toISOString().slice(0, 10));
  }

  if (loading || !patient) {
    return (
      <div className="page">
        <div className="topbar">
          <Link href="/" className="back-btn">← Back</Link>
        </div>
        <div className="loading">{loading ? 'Loading...' : 'Patient not found'}</div>
      </div>
    );
  }

  const age = calcAge(patient.birth_date);
  const admDate = patient.admission_date;
  const hd = admDate
    ? Math.floor((new Date(viewDate) - new Date(admDate)) / 86400000)
    : null;

  const isToday = viewDate === today();

  return (
    <div className="page">
      {/* Header */}
      <div className="topbar">
        <div className="topbar-row">
          <Link href="/" className="back-btn">← Ward</Link>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            #{patient.chart_number}
          </span>
        </div>
      </div>

      {/* Patient info */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>{patient.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
              {age !== '?' ? `${age}y ` : ''}{patient.gender}
              {patient.birth_date && ` · ${patient.birth_date}`}
            </div>
          </div>
          <span className={`badge badge-${patient.status === 'starred' ? 'starred' : patient.status === 'archived' ? 'archived' : 'active'}`}>
            {patient.status === 'starred' ? '⭐' : patient.status}
          </span>
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="badge badge-dept">{patient.department}</span>
          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            {patient.hospital}
          </span>
          <span className="badge" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
            Bed {patient.bed}
          </span>
        </div>

        {patient.chief_complaint && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600 }}>CC:</span> {patient.chief_complaint}
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>{patient.diagnosis}</div>
      </div>

      {/* Tracking items */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Follow up</div>
          <button
            onClick={() => setShowTrackingInput(!showTrackingInput)}
            style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}
          >
            {showTrackingInput ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {showTrackingInput && (
          <div style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
            <input
              value={newTracking}
              onChange={e => setNewTracking(e.target.value)}
              placeholder="e.g. Check Cr trend tomorrow"
              onKeyDown={e => e.key === 'Enter' && handleAddTracking()}
              autoFocus
            />
            <button
              onClick={handleAddTracking}
              disabled={savingTracking}
              style={{
                padding: '10px 16px', background: 'var(--blue)', color: 'white',
                borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              Add
            </button>
          </div>
        )}

        {trackingItems.length === 0 && !showTrackingInput && (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>
            No follow-up items
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {trackingItems.map(item => (
            <div key={item.item_id} className="tracking-item">
              <div className="tracking-item-text">{item.content}</div>
              <button
                className="tracking-delete"
                onClick={() => handleDeleteTracking(item.item_id)}
              >×</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

      {/* SOAP date navigation */}
      <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => goDay(-1)} style={{ padding: '6px 12px', fontSize: 20, color: 'var(--text-secondary)' }}>‹</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {viewDate === today() ? 'Today' : viewDate}
          </div>
          {hd !== null && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              HD {hd >= 0 ? hd : '—'}
            </div>
          )}
        </div>
        <button
          onClick={() => goDay(1)}
          disabled={isToday}
          style={{ padding: '6px 12px', fontSize: 20, color: isToday ? 'var(--border)' : 'var(--text-secondary)' }}
        >›</button>
      </div>

      {/* SOAP */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>SOAP</div>
          {isToday && (
            <button
              onClick={() => setShowSoapForm(!showSoapForm)}
              style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}
            >
              {showSoapForm ? 'Cancel' : '+ Update'}
            </button>
          )}
        </div>

        {/* SOAP input form */}
        {showSoapForm && (
          <div className="soap-form">
            <div className="soap-form-header">New update — {new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="soap-form-body">
              {['subjective', 'objective', 'assessment', 'plan'].map(field => (
                <div key={field}>
                  <div className="soap-label">{field.charAt(0).toUpperCase()}</div>
                  <textarea
                    className="soap-textarea"
                    value={soapForm[field]}
                    onChange={e => setSoapForm({ ...soapForm, [field]: e.target.value })}
                    placeholder={
                      field === 'subjective' ? "Patient's complaints, how they feel..."
                      : field === 'objective' ? 'Vitals, labs, exam findings...'
                      : field === 'assessment' ? 'Your clinical assessment...'
                      : 'Plan, orders, next steps...'
                    }
                    rows={3}
                  />
                </div>
              ))}
              <button className="btn-primary" onClick={handleSaveSOAP} disabled={savingSoap}>
                {savingSoap ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Existing SOAP entries */}
        {soapEntries.length === 0 && !showSoapForm && (
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>
            No entries for this day
            {isToday && ' — tap + Update to add one'}
          </div>
        )}

        {soapEntries.map((entry, i) => (
          <div key={entry.record_id} className="soap-entry">
            <div className="soap-entry-header">
              <span>Update {soapEntries.length - i}</span>
              <span>{formatTime(entry.timestamp)}</span>
            </div>
            <div className="soap-entry-body">
              {['subjective', 'objective', 'assessment', 'plan'].map(field => (
                entry[field] ? (
                  <div key={field} className="soap-field">
                    <div className="soap-label">{field.charAt(0).toUpperCase()}</div>
                    <div className="soap-text">{entry[field]}</div>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
