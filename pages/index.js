import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPatients, addPatient, updatePatientStatus,
  getOPDVisits, addOPDVisit,
  getPearls, addPearl,
  calcAge, formatDate,
} from '../lib/api';

const HOSPITALS = ['TMU', 'Tübingen', 'NUH', 'Other'];
const DEPARTMENTS = ['General Surgery', 'Trauma Surgery', 'Internal Medicine', 'OPD', 'Cardiology', 'Neurology', 'Other'];
const GENDERS = ['M', 'F'];

export default function Home() {
  const [tab, setTab] = useState('ward');
  const [patients, setPatients] = useState([]);
  const [opdVisits, setOpdVisits] = useState([]);
  const [pearls, setPearls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'patient' | 'opd' | 'pearl'
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('active');

  // Patient form
  const [pForm, setPForm] = useState({
    name: '', chart_number: '', birth_date: '', gender: 'M',
    bed: '', hospital: 'TMU', department: 'General Surgery',
    chief_complaint: '', diagnosis: '', admission_date: '',
  });

  // OPD form
  const [oForm, setOForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hospital: 'TMU', department: 'OPD',
    chief_complaint: '', diagnosis: '',
    impression: '', learning_point: '',
  });

  // Pearl form
  const [plForm, setPlForm] = useState({
    source: '', department: 'General Surgery', content: '',
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [p, o, pl] = await Promise.all([getPatients(), getOPDVisits(), getPearls()]);
    setPatients(Array.isArray(p) ? p : []);
    setOpdVisits(Array.isArray(o) ? o : []);
    setPearls(Array.isArray(pl) ? pl : []);
    setLoading(false);
  }

  const wardPatients = patients.filter(p =>
    filter === 'all' ? true : p.status === filter
  );

  async function handleAddPatient() {
    if (!pForm.name || !pForm.diagnosis) return;
    setSaving(true);
    await addPatient(pForm);
    await loadAll();
    setSaving(false);
    setModal(null);
    setPForm({
      name: '', chart_number: '', birth_date: '', gender: 'M',
      bed: '', hospital: 'TMU', department: 'General Surgery',
      chief_complaint: '', diagnosis: '', admission_date: '',
    });
  }

  async function handleAddOPD() {
    if (!oForm.diagnosis) return;
    setSaving(true);
    await addOPDVisit(oForm);
    await loadAll();
    setSaving(false);
    setModal(null);
  }

  async function handleAddPearl() {
    if (!plForm.content) return;
    setSaving(true);
    await addPearl(plForm);
    await loadAll();
    setSaving(false);
    setModal(null);
    setPlForm({ source: '', department: 'General Surgery', content: '' });
  }

  async function handleStatus(patient_id, status) {
    await updatePatientStatus(patient_id, status);
    await loadAll();
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="topbar-row">
          <span className="topbar-title">Clinical Tracker</span>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            {new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
        <div className="tabs">
          {['ward', 'opd', 'pearls'].map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'ward' ? '🏥 Ward' : t === 'opd' ? '🩺 OPD' : '💡 Pearls'}
            </button>
          ))}
        </div>
      </div>

      {/* WARD TAB */}
      {tab === 'ward' && (
        <>
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['active', 'starred', 'archived', 'all'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  border: '1px solid var(--border)',
                  background: filter === f ? 'var(--text)' : 'var(--surface)',
                  color: filter === f ? 'white' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {f === 'active' ? 'Active' : f === 'starred' ? '⭐ Starred' : f === 'archived' ? 'Archived' : 'All'}
              </button>
            ))}
          </div>

          <div className="section">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : wardPatients.length === 0 ? (
              <div className="empty">
                {filter === 'active' ? 'No active patients\nTap + to add your first patient' : 'Nothing here'}
              </div>
            ) : (
              <div className="list-gap">
                {wardPatients.map(p => (
                  <PatientCard key={p.patient_id} patient={p} onStatusChange={handleStatus} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* OPD TAB */}
      {tab === 'opd' && (
        <div className="section">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : opdVisits.length === 0 ? (
            <div className="empty">No OPD records yet\nTap + to add a visit</div>
          ) : (
            <div className="list-gap">
              {opdVisits.map(v => (
                <div key={v.visit_id} className="card">
                  <div className="opd-card">
                    <div className="opd-date">{formatDate(v.date)} · {v.hospital} · {v.department}</div>
                    <div className="opd-dx">{v.diagnosis}</div>
                    {v.chief_complaint && (
                      <div className="opd-detail">CC: {v.chief_complaint}</div>
                    )}
                    {v.impression && (
                      <div className="opd-detail">Impression: {v.impression}</div>
                    )}
                    {v.learning_point && (
                      <div className="opd-learning">💡 {v.learning_point}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PEARLS TAB */}
      {tab === 'pearls' && (
        <div className="section">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : pearls.length === 0 ? (
            <div className="empty">Pearl collection is empty\nTap + to capture one</div>
          ) : (
            <div className="list-gap">
              {pearls.map(pl => (
                <div key={pl.pearl_id} className="card">
                  <div className="pearl-card">
                    <div className="pearl-source">
                      {pl.source && `${pl.source} · `}{pl.department}
                    </div>
                    <div className="pearl-content">{pl.content}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
                      {formatDate(pl.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => {
        if (tab === 'ward') setModal('patient');
        else if (tab === 'opd') setModal('opd');
        else setModal('pearl');
      }}>+</button>

      {/* ADD PATIENT MODAL */}
      {modal === 'patient' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">New Patient</div>

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })}
                placeholder="Patient name" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Chart No.</label>
                <input value={pForm.chart_number} onChange={e => setPForm({ ...pForm, chart_number: e.target.value })}
                  placeholder="e.g. 123456" />
              </div>
              <div className="form-group">
                <label className="form-label">Bed</label>
                <input value={pForm.bed} onChange={e => setPForm({ ...pForm, bed: e.target.value })}
                  placeholder="e.g. 7B-12" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date of birth</label>
                <input type="date" value={pForm.birth_date}
                  onChange={e => setPForm({ ...pForm, birth_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select value={pForm.gender} onChange={e => setPForm({ ...pForm, gender: e.target.value })}>
                  {GENDERS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hospital</label>
                <select value={pForm.hospital} onChange={e => setPForm({ ...pForm, hospital: e.target.value })}>
                  {HOSPITALS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={pForm.department} onChange={e => setPForm({ ...pForm, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Chief complaint</label>
              <input value={pForm.chief_complaint}
                onChange={e => setPForm({ ...pForm, chief_complaint: e.target.value })}
                placeholder="e.g. Abdominal pain 3 days" />
            </div>

            <div className="form-group">
              <label className="form-label">Diagnosis *</label>
              <input value={pForm.diagnosis} onChange={e => setPForm({ ...pForm, diagnosis: e.target.value })}
                placeholder="Primary diagnosis" />
            </div>

            <div className="form-group">
              <label className="form-label">Admission date</label>
              <input type="date" value={pForm.admission_date}
                onChange={e => setPForm({ ...pForm, admission_date: e.target.value })} />
            </div>

            <button className="btn-primary" onClick={handleAddPatient} disabled={saving}>
              {saving ? 'Saving...' : 'Add Patient'}
            </button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ADD OPD MODAL */}
      {modal === 'opd' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">OPD Visit</div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={oForm.date}
                  onChange={e => setOForm({ ...oForm, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital</label>
                <select value={oForm.hospital} onChange={e => setOForm({ ...oForm, hospital: e.target.value })}>
                  {HOSPITALS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select value={oForm.department} onChange={e => setOForm({ ...oForm, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Chief complaint</label>
              <input value={oForm.chief_complaint}
                onChange={e => setOForm({ ...oForm, chief_complaint: e.target.value })}
                placeholder="e.g. Knee pain" />
            </div>

            <div className="form-group">
              <label className="form-label">Diagnosis *</label>
              <input value={oForm.diagnosis} onChange={e => setOForm({ ...oForm, diagnosis: e.target.value })}
                placeholder="e.g. Osteoarthritis knee" />
            </div>

            <div className="form-group">
              <label className="form-label">Impression</label>
              <textarea value={oForm.impression}
                onChange={e => setOForm({ ...oForm, impression: e.target.value })}
                placeholder="What stood out about this case?" rows={3} />
            </div>

            <div className="form-group">
              <label className="form-label">Learning point 💡</label>
              <textarea value={oForm.learning_point}
                onChange={e => setOForm({ ...oForm, learning_point: e.target.value })}
                placeholder="What did you learn?" rows={3} />
            </div>

            <button className="btn-primary" onClick={handleAddOPD} disabled={saving}>
              {saving ? 'Saving...' : 'Save Visit'}
            </button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ADD PEARL MODAL */}
      {modal === 'pearl' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">💡 Capture a Pearl</div>

            <div className="form-group">
              <label className="form-label">Source (who said it / where)</label>
              <input value={plForm.source} onChange={e => setPlForm({ ...plForm, source: e.target.value })}
                placeholder="e.g. 主任查房, Trauma teaching" />
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select value={plForm.department} onChange={e => setPlForm({ ...plForm, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pearl *</label>
              <textarea value={plForm.content} onChange={e => setPlForm({ ...plForm, content: e.target.value })}
                placeholder="Write it down before you forget..." rows={5} />
            </div>

            <button className="btn-primary" onClick={handleAddPearl} disabled={saving}>
              {saving ? 'Saving...' : 'Save Pearl'}
            </button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientCard({ patient: p, onStatusChange }) {
  const age = calcAge(p.birth_date);
  const [showActions, setShowActions] = useState(false);

  return (
    <div>
      <Link href={`/patient/${p.patient_id}`} className="card-pressable">
        <div className="patient-card">
          <div className="patient-card-top">
            <div>
              <div className="patient-name">{p.name}</div>
              <div className="patient-meta">
                {age !== '?' ? `${age}y ` : ''}{p.gender} · {p.bed || '—'} · #{p.chart_number || '—'}
              </div>
            </div>
            <span className={`badge badge-${p.status === 'starred' ? 'starred' : p.status === 'archived' ? 'archived' : 'active'}`}>
              {p.status === 'starred' ? '⭐' : p.status === 'archived' ? 'Archived' : 'Active'}
            </span>
          </div>
          {p.chief_complaint && (
            <div className="patient-cc">CC: {p.chief_complaint}</div>
          )}
          <div className="patient-dx" style={{ marginTop: 4 }}>{p.diagnosis}</div>
          <div className="patient-footer">
            <span className="badge badge-dept">{p.department}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{p.hospital}</span>
          </div>
        </div>
      </Link>
      <div style={{ padding: '6px 0 2px', display: 'flex', gap: 6, paddingLeft: 2 }}>
        {p.status !== 'starred' && (
          <button className="status-btn" onClick={() => onStatusChange(p.patient_id, 'starred')}>⭐ Star</button>
        )}
        {p.status !== 'archived' && (
          <button className="status-btn" onClick={() => onStatusChange(p.patient_id, 'archived')}>Archive</button>
        )}
        {p.status === 'archived' && (
          <button className="status-btn" onClick={() => onStatusChange(p.patient_id, 'active')}>Restore</button>
        )}
        <button className="status-btn danger" onClick={() => onStatusChange(p.patient_id, 'deleted')}>Delete</button>
      </div>
    </div>
  );
}
