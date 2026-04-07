import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getPatients, addPatient, updatePatientStatus,
  getOPDVisits, addOPDVisit,
  getPearls, addPearl, updatePearl, deletePearl, uploadPearlImage,
  getAllTrackingItems,
  calcAge, calcHD, formatDate,
} from '../lib/api';

const PRESET_HOSPITALS = ['TMU', 'WFH', 'SHH', 'Others'];
const PRESET_DEPARTMENTS = ['General Surgery', 'Internal Medicine', 'OB/GYN', 'Pediatrics', 'Emergency'];
const GENDERS = ['M', 'F'];

export default function Home() {
  const [tab, setTab] = useState('ward');
  const [patients, setPatients] = useState([]);
  const [trackingMap, setTrackingMap] = useState({});
  const [opdVisits, setOpdVisits] = useState([]);
  const [pearls, setPearls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState('active');
  const [deptFilter, setDeptFilter] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pearlDeptFilter, setPearlDeptFilter] = useState('');
  const [expandedPearl, setExpandedPearl] = useState(null);
  const [editingPearl, setEditingPearl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const [pForm, setPForm] = useState({
    name: '', chart_number: '', birth_date: '', gender: 'M',
    bed: '', hospital: 'TMU', department: 'General Surgery',
    chief_complaint: '', diagnosis: '', admission_date: '', discharge_date: '',
  });
  const [customHospital, setCustomHospital] = useState('');
  const [customDept, setCustomDept] = useState('');

  const [oForm, setOForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hospital: 'TMU', department: 'Emergency',
    chief_complaint: '', diagnosis: '', impression: '', learning_point: '',
  });

  const [plForm, setPlForm] = useState({
    title: '', source: '', department: 'General Surgery', content: '',
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [p, o, pl, ti] = await Promise.all([
      getPatients(), getOPDVisits(), getPearls(), getAllTrackingItems()
    ]);
    setPatients(Array.isArray(p) ? p : []);
    setOpdVisits(Array.isArray(o) ? o : []);
    setPearls(Array.isArray(pl) ? pl : []);
    // Build map: patient_id -> [items]
    const map = {};
    if (Array.isArray(ti)) {
      ti.forEach(item => {
        if (!map[item.patient_id]) map[item.patient_id] = [];
        map[item.patient_id].push(item);
      });
    }
    setTrackingMap(map);
    setLoading(false);
  }

  const allDepts = [...new Set([...PRESET_DEPARTMENTS, ...patients.map(p => p.department).filter(Boolean)])];
  const allHospitals = [...new Set([...PRESET_HOSPITALS, ...patients.map(p => p.hospital).filter(Boolean)])];

  const filteredPatients = patients.filter(p => {
    if (p.status === "deleted") return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (deptFilter && p.department !== deptFilter) return false;
    if (hospitalFilter && p.hospital !== hospitalFilter) return false;
    return true;
  });

  async function handleAddPatient() {
    const hospital = pForm.hospital === 'Others' ? customHospital : pForm.hospital;
    const department = pForm.department === 'Others' ? customDept : pForm.department;
    if (!pForm.name || !pForm.diagnosis) return;
    setSaving(true);
    await addPatient({ ...pForm, hospital, department });
    await loadAll();
    setSaving(false);
    setModal(null);
    setPForm({ name: '', chart_number: '', birth_date: '', gender: 'M', bed: '', hospital: 'TMU', department: 'General Surgery', chief_complaint: '', diagnosis: '', admission_date: '', discharge_date: '' });
    setCustomHospital(''); setCustomDept('');
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
    setPlForm({ title: '', source: '', department: 'General Surgery', content: '' });
  }

  async function handleStarPearl(pearl_id, starred) {
    await updatePearl(pearl_id, { starred: !starred });
    await loadAll();
  }

  async function handleDeletePearl(pearl_id) {
    if (!confirm('Delete this pearl?')) return;
    await deletePearl(pearl_id);
    await loadAll();
  }

  async function handleUpdatePearl() {
    if (!editingPearl) return;
    setSaving(true);
    await updatePearl(editingPearl.pearl_id, {
      title: editingPearl.title,
      source: editingPearl.source,
      department: editingPearl.department,
      content: editingPearl.content,
    });
    await loadAll();
    setSaving(false);
    setEditingPearl(null);
  }

  async function handlePearlImageUpload(pearl_id, file) {
    setImageUploading(true);
    const url = await uploadPearlImage(file);
    if (url) await updatePearl(pearl_id, { image_url: url });
    await loadAll();
    setImageUploading(false);
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

      {tab === 'ward' && (
        <>
          <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
              {['active', 'starred', 'archived', 'all'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: '1px solid var(--border)',
                  background: statusFilter === f ? 'var(--text)' : 'var(--surface)',
                  color: statusFilter === f ? 'white' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                }}>
                  {f === 'active' ? 'Active' : f === 'starred' ? '⭐' : f === 'archived' ? 'Archived' : 'All'}
                </button>
              ))}
            </div>
            <button onClick={() => setShowFilters(!showFilters)} style={{
              padding: '5px 10px', borderRadius: 20, fontSize: 12,
              border: '1px solid var(--border)',
              background: (deptFilter || hospitalFilter) ? 'var(--blue-bg)' : 'var(--surface)',
              color: (deptFilter || hospitalFilter) ? 'var(--blue)' : 'var(--text-secondary)',
              cursor: 'pointer', flexShrink: 0,
            }}>⚙{(deptFilter || hospitalFilter) ? ' •' : ''}</button>
          </div>

          {showFilters && (
            <div style={{ padding: '8px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="">All Depts</option>
                {allDepts.map(d => <option key={d}>{d}</option>)}
              </select>
              <select value={hospitalFilter} onChange={e => setHospitalFilter(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="">All Hospitals</option>
                {allHospitals.map(h => <option key={h}>{h}</option>)}
              </select>
              {(deptFilter || hospitalFilter) && (
                <button onClick={() => { setDeptFilter(''); setHospitalFilter(''); }}
                  style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
              )}
            </div>
          )}

          <div style={{ padding: '12px 16px 80px' }}>
            {loading ? <div className="loading">Loading...</div>
              : filteredPatients.length === 0 ? <div className="empty">No patients · tap + to add</div>
                : (
                  <div style={{
                    display: 'flex', gap: 12,
                    flexWrap: 'wrap',
                  }}>
                    {filteredPatients.map(p => (
                      <PatientCard
                        key={p.patient_id}
                        patient={p}
                        trackingItems={trackingMap[p.patient_id] || []}
                        onStatusChange={handleStatus}
                      />
                    ))}
                  </div>
                )}
          </div>
        </>
      )}

      {tab === 'opd' && (
        <div className="section">
          {loading ? <div className="loading">Loading...</div>
            : opdVisits.length === 0 ? <div className="empty">No OPD records yet</div>
              : <div className="list-gap">
                {opdVisits.map(v => (
                  <div key={v.visit_id} className="card">
                    <div className="opd-card">
                      <div className="opd-date">{formatDate(v.date)} · {v.hospital} · {v.department}</div>
                      <div className="opd-dx">{v.diagnosis}</div>
                      {v.chief_complaint && <div className="opd-detail">CC: {v.chief_complaint}</div>}
                      {v.impression && <div className="opd-detail">Impression: {v.impression}</div>}
                      {v.learning_point && <div className="opd-learning">💡 {v.learning_point}</div>}
                    </div>
                  </div>
                ))}
              </div>}
        </div>
      )}

      {tab === 'pearls' && (
        <div className="section">
          <div style={{ padding: '10px 16px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['All', ...PRESET_DEPARTMENTS].map(d => (
              <button key={d} onClick={() => setPearlDeptFilter(d === 'All' ? '' : d)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: '1px solid var(--border)',
                background: (d === 'All' && !pearlDeptFilter) || pearlDeptFilter === d ? 'var(--text)' : 'var(--surface)',
                color: (d === 'All' && !pearlDeptFilter) || pearlDeptFilter === d ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{d}</button>
            ))}
          </div>
          <div style={{ padding: '10px 16px 80px' }}>
          {loading ? <div className="loading">Loading...</div>
            : pearls.length === 0 ? <div className="empty">Pearl collection is empty</div>
              : <div className="list-gap">
                {pearls
                  .filter(pl => !pearlDeptFilter || pl.department === pearlDeptFilter)
                  .map(pl => {
                    const isExpanded = expandedPearl === pl.pearl_id;
                    const displayTitle = pl.title || pl.content.split('\n')[0].slice(0, 60);
                    return (
                      <div key={pl.pearl_id} className="card">
                        <div className="pearl-card" onClick={() => setExpandedPearl(isExpanded ? null : pl.pearl_id)} style={{ cursor: 'pointer' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                              {pl.starred && <span style={{ color: '#d97706', marginRight: 4 }}>⭐</span>}
                              {pl.source && `${pl.source} · `}{pl.department} · {formatDate(pl.created_at)}
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{isExpanded ? '▲' : '▼'}</span>
                          </div>
                          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', marginTop: 4 }}>{displayTitle}</div>
                          {isExpanded && (
                            <>
                              <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                {pl.content}
                              </div>
                              {pl.image_url && (
                                <img src={pl.image_url} alt="pearl" style={{ marginTop: 10, maxWidth: '100%', borderRadius: 8 }} />
                              )}
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          <button className="card-action" onClick={() => handleStarPearl(pl.pearl_id, pl.starred)}>
                            {pl.starred ? '✕ Unstar' : '⭐'}
                          </button>
                          <button className="card-action" onClick={() => setEditingPearl({...pl})}>Edit</button>
                          <label className="card-action" style={{ cursor: 'pointer' }}>
                            {imageUploading ? 'Uploading...' : '🖼 Image'}
                            <input type="file" accept="image/*" style={{ display: 'none' }}
                              onChange={e => e.target.files[0] && handlePearlImageUpload(pl.pearl_id, e.target.files[0])} />
                          </label>
                          <button className="card-action danger" onClick={() => handleDeletePearl(pl.pearl_id)}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
              </div>}
          </div>
        </div>
      )}

      <button className="fab" onClick={() => {
        if (tab === 'ward') setModal('patient');
        else if (tab === 'opd') setModal('opd');
        else setModal('pearl');
      }}>+</button>

      {modal === 'patient' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">New Patient</div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input value={pForm.name} onChange={e => setPForm({ ...pForm, name: e.target.value })} placeholder="Patient name" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Chart No.</label>
                <input value={pForm.chart_number} onChange={e => setPForm({ ...pForm, chart_number: e.target.value })} placeholder="123456" />
              </div>
              <div className="form-group">
                <label className="form-label">Bed</label>
                <input value={pForm.bed} onChange={e => setPForm({ ...pForm, bed: e.target.value })} placeholder="7B-12" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">DOB</label>
                <input type="date" value={pForm.birth_date} onChange={e => setPForm({ ...pForm, birth_date: e.target.value })} />
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
                  {PRESET_HOSPITALS.map(h => <option key={h}>{h}</option>)}
                </select>
                {pForm.hospital === 'Others' && (
                  <input style={{ marginTop: 6 }} value={customHospital} onChange={e => setCustomHospital(e.target.value)} placeholder="Hospital name" />
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={pForm.department} onChange={e => setPForm({ ...pForm, department: e.target.value })}>
                  {PRESET_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  <option value="Others">Others</option>
                </select>
                {pForm.department === 'Others' && (
                  <input style={{ marginTop: 6 }} value={customDept} onChange={e => setCustomDept(e.target.value)} placeholder="Department name" />
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Chief complaint</label>
              <input value={pForm.chief_complaint} onChange={e => setPForm({ ...pForm, chief_complaint: e.target.value })} placeholder="e.g. Abdominal pain 3 days" />
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosis *</label>
              <input value={pForm.diagnosis} onChange={e => setPForm({ ...pForm, diagnosis: e.target.value })} placeholder="Primary diagnosis" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Admission date</label>
                <input type="date" value={pForm.admission_date} onChange={e => setPForm({ ...pForm, admission_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Discharge date</label>
                <input type="date" value={pForm.discharge_date} onChange={e => setPForm({ ...pForm, discharge_date: e.target.value })} />
              </div>
            </div>
            <button className="btn-primary" onClick={handleAddPatient} disabled={saving}>{saving ? 'Saving...' : 'Add Patient'}</button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal === 'opd' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">OPD Visit</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={oForm.date} onChange={e => setOForm({ ...oForm, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital</label>
                <select value={oForm.hospital} onChange={e => setOForm({ ...oForm, hospital: e.target.value })}>
                  {PRESET_HOSPITALS.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select value={oForm.department} onChange={e => setOForm({ ...oForm, department: e.target.value })}>
                {PRESET_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Chief complaint</label>
              <input value={oForm.chief_complaint} onChange={e => setOForm({ ...oForm, chief_complaint: e.target.value })} placeholder="e.g. Knee pain" />
            </div>
            <div className="form-group">
              <label className="form-label">Diagnosis *</label>
              <input value={oForm.diagnosis} onChange={e => setOForm({ ...oForm, diagnosis: e.target.value })} placeholder="e.g. Osteoarthritis" />
            </div>
            <div className="form-group">
              <label className="form-label">Impression</label>
              <textarea value={oForm.impression} onChange={e => setOForm({ ...oForm, impression: e.target.value })} placeholder="What stood out?" rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Learning point 💡</label>
              <textarea value={oForm.learning_point} onChange={e => setOForm({ ...oForm, learning_point: e.target.value })} placeholder="What did you learn?" rows={3} />
            </div>
            <button className="btn-primary" onClick={handleAddOPD} disabled={saving}>{saving ? 'Saving...' : 'Save Visit'}</button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {modal === 'pearl' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">💡 Capture a Pearl</div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={plForm.title} onChange={e => setPlForm({ ...plForm, title: e.target.value })} placeholder="e.g. Appendicitis workup" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source</label>
                <input value={plForm.source} onChange={e => setPlForm({ ...plForm, source: e.target.value })} placeholder="e.g. 主任查房" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={plForm.department} onChange={e => setPlForm({ ...plForm, department: e.target.value })}>
                  {PRESET_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Content *</label>
              <textarea value={plForm.content} onChange={e => setPlForm({ ...plForm, content: e.target.value })} placeholder="Paste or write content here... formatting is preserved" rows={8} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <button className="btn-primary" onClick={handleAddPearl} disabled={saving}>{saving ? 'Saving...' : 'Save Pearl'}</button>
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
          </div>
        </div>
      )}

      {editingPearl && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingPearl(null)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Edit Pearl</div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input value={editingPearl.title || ''} onChange={e => setEditingPearl({...editingPearl, title: e.target.value})} placeholder="Title" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Source</label>
                <input value={editingPearl.source || ''} onChange={e => setEditingPearl({...editingPearl, source: e.target.value})} placeholder="Source" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select value={editingPearl.department || ''} onChange={e => setEditingPearl({...editingPearl, department: e.target.value})}>
                  {PRESET_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Content</label>
              <textarea value={editingPearl.content || ''} onChange={e => setEditingPearl({...editingPearl, content: e.target.value})} rows={8} style={{ fontFamily: 'monospace', fontSize: 13 }} />
            </div>
            <button className="btn-primary" onClick={handleUpdatePearl} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            <button className="btn-secondary" onClick={() => setEditingPearl(null)}>Cancel</button>
          </div>
        </div>
      )}

      <style>{`
        .pcard {
          width: 160px;
          height: 200px;
          border-radius: 16px;
          padding: 13px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-decoration: none;
          transition: transform 0.15s;
          background: linear-gradient(145deg, #1e4ed8 0%, #1e3a8a 100%);
        }
        .pcard:active { transform: scale(0.97); }
        .pcard.starred { background: linear-gradient(145deg, #d97706 0%, #92400e 100%); }
        .pcard.archived { background: linear-gradient(145deg, #6b7280 0%, #374151 100%); }
        .pcard-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .pcard-hd { font-size: 13px; color: rgba(255,255,255,0.85); font-weight: 700; white-space: nowrap; }
        .pcard-name { font-size: 18px; font-weight: 800; color: white; line-height: 1.2; }
        .pcard-bed { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 2px; }
        .pcard-follow { margin-top: 6px; }
        .pcard-follow-item {
          font-size: 10px; color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.15);
          border-radius: 6px; padding: 3px 6px;
          margin-bottom: 3px; line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .pcard-dx { font-size: 11px; color: rgba(255,255,255,0.8); font-style: italic; }
        .card-actions { display: flex; gap: 5px; margin-top: 6px; flex-wrap: wrap; }
        .card-action { font-size: 11px; padding: 3px 8px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; }
        .card-action.danger { color: var(--red); border-color: #fecaca; }
        .card-action.amber { color: var(--amber); }
        .card-action.blue { color: var(--blue); }
      `}</style>
    </div>
  );
}

function PatientCard({ patient: p, trackingItems, onStatusChange }) {
  const age = calcAge(p.birth_date);
  const hd = calcHD(p.admission_date);
  const cls = `pcard${p.status === 'starred' ? ' starred' : p.status === 'archived' ? ' archived' : ''}`;
  const showItems = trackingItems.slice(0, 2);

  return (
    <div>
      <Link href={`/patient/${p.patient_id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div className={cls}>
          <div>
            <div className="pcard-top">
              <div>
                <div className="pcard-name">{p.name}</div>
                <div className="pcard-bed">{age !== '?' ? `${age}y ` : ''}{p.gender} · {p.bed || '—'}</div>
              </div>
              {hd !== null && (
                <div className="pcard-hd">HD{hd}</div>
              )}
            </div>
            {showItems.length > 0 && (
              <div className="pcard-follow">
                {showItems.map(item => (
                  <div key={item.item_id} className="pcard-follow-item">⚑ {item.content}</div>
                ))}
                {trackingItems.length > 2 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', paddingLeft: 2 }}>+{trackingItems.length - 2} more</div>
                )}
              </div>
            )}
          </div>
          <div className="pcard-dx"># {p.diagnosis}</div>
        </div>
      </Link>
      <div className="card-actions">
        {p.status !== 'starred'
          ? <button className="card-action" onClick={() => onStatusChange(p.patient_id, 'starred')}>⭐</button>
          : <button className="card-action amber" onClick={() => onStatusChange(p.patient_id, 'active')}>✕ Unstar</button>
        }
        {p.status === 'archived'
          ? <button className="card-action blue" onClick={() => onStatusChange(p.patient_id, 'active')}>Restore</button>
          : <button className="card-action" onClick={() => onStatusChange(p.patient_id, 'archived')}>Archive</button>
        }
        <button className="card-action danger" onClick={() => onStatusChange(p.patient_id, 'deleted')}>Del</button>
      </div>
    </div>
  );
}
