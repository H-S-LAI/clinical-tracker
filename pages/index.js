import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  const [pearlStatusFilter, setPearlStatusFilter] = useState('all');
  const [pearlDeptFilter, setPearlDeptFilter] = useState('');
  const [showPearlFilters, setShowPearlFilters] = useState(false);
  const [expandedPearl, setExpandedPearl] = useState(null);
  const [editingPearl, setEditingPearl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [editorMode, setEditorMode] = useState('write');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [contextMenu, setContextMenu] = useState(null); // { type, id, x, y, data }

  const [pForm, setPForm] = useState({
    name: '', chart_number: '', birth_date: '', gender: 'M',
    bed: '', hospital: 'TMU', department: 'General Surgery',
    chief_complaint: '', diagnosis: '', admission_date: new Date().toISOString().slice(0, 10), discharge_date: '',
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


  function insertFormat(value, setter, prefix, suffix = '') {
    const ta = document.activeElement;
    if (!ta || ta.tagName !== 'TEXTAREA') {
      setter(value + prefix + suffix);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    setter(newVal);
    setTimeout(() => {
      ta.selectionStart = start + prefix.length;
      ta.selectionEnd = start + prefix.length + selected.length;
      ta.focus();
    }, 0);
  }

  async function handlePasteImage(e, currentContent, onUpdate) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        setImageUploading(true);
        const file = item.getAsFile();
        const url = await uploadPearlImage(file);
        if (url) onUpdate(currentContent + `\n![image](${url})\n`);
        setImageUploading(false);
        return;
      }
    }
  }

  async function handleDropImage(e, currentContent, onUpdate) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageUploading(true);
    const url = await uploadPearlImage(file);
    if (url) onUpdate(currentContent + `\n![image](${url})\n`);
    setImageUploading(false);
  }

  function openMenu(e, type, id, data = {}) {
    e.preventDefault();
    e.stopPropagation();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setContextMenu({ type, id, x, y, data });
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function bulkDeletePearls() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} pearl(s)?`)) return;
    await Promise.all([...selected].map(id => deletePearl(id)));
    setSelected(new Set()); setSelectMode(false);
    await loadAll();
  }

  async function bulkStarPearls() {
    if (!selected.size) return;
    await Promise.all([...selected].map(id => updatePearl(id, { starred: true })));
    setSelected(new Set()); setSelectMode(false);
    await loadAll();
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
                        onOpenMenu={openMenu}
                      />
                    ))}
                  </div>
                )}
          </div>
        </>
      )}

      {tab === 'opd' && (
        <div className="section">
          <div style={{ padding: '10px 16px 80px' }}>
          {loading ? <div className="loading">Loading...</div>
            : opdVisits.length === 0 ? <div className="empty">No OPD records yet · tap + to add</div>
              : <div className="list-gap">
                {opdVisits.map(v => {
                  const isExp = expandedPearl === v.visit_id;
                  return (
                    <div key={v.visit_id} className="card" style={{ padding: 0, overflow: 'hidden', userSelect: 'none' }}
                      onContextMenu={e => openMenu(e, 'opd', v.visit_id, v)}
                      style={{ padding: 0, overflow: 'hidden', userSelect: 'none', WebkitTouchCallout: 'none' }}
                      onTouchStart={e => { let t = setTimeout(() => openMenu(e, 'opd', v.visit_id, v), 600); v._t = t; }}
                      onTouchEnd={() => clearTimeout(v._t)}
                      onTouchMove={() => clearTimeout(v._t)}
                    >
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedPearl(isExp ? null : v.visit_id)} >
                          <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.diagnosis}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{v.department} · {v.hospital} · {formatDate(v.date)}</div>
                        </div>
                        <button onClick={() => setExpandedPearl(isExp ? null : v.visit_id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12, padding: '4px 6px', flexShrink: 0, transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</button>
                      </div>
                      {isExp && (
                        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
                          {v.chief_complaint && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10 }}>CC: {v.chief_complaint}</div>}
                          {v.impression && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Impression: {v.impression}</div>}
                          {v.learning_point && <div style={{ fontSize: 13, color: 'var(--blue)', marginTop: 6 }}>💡 {v.learning_point}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}
          </div>
        </div>
      )}

      {tab === 'pearls' && (
        <div className="section">
          <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flex: 1, overflowX: 'auto' }}>
              {['all', 'starred'].map(f => (
                <button key={f} onClick={() => { setPearlStatusFilter(f); setSelectMode(false); setSelected(new Set()); }} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: '1px solid var(--border)',
                  background: pearlStatusFilter === f ? 'var(--text)' : 'var(--surface)',
                  color: pearlStatusFilter === f ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {f === 'all' ? 'All' : '⭐ Starred'}
                </button>
              ))}
            </div>
            <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} style={{
              padding: '5px 10px', borderRadius: 20, fontSize: 12,
              border: '1px solid var(--border)',
              background: selectMode ? 'var(--text)' : 'var(--surface)',
              color: selectMode ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer', flexShrink: 0,
            }}>Select</button>
            <button onClick={() => setShowPearlFilters(!showPearlFilters)} style={{
              padding: '5px 10px', borderRadius: 20, fontSize: 12,
              border: '1px solid var(--border)',
              background: pearlDeptFilter ? 'var(--blue-bg)' : 'var(--surface)',
              color: pearlDeptFilter ? 'var(--blue)' : 'var(--text-secondary)',
              cursor: 'pointer', flexShrink: 0,
            }}>⚙{pearlDeptFilter ? ' •' : ''}</button>
          </div>

          {showPearlFilters && (
            <div style={{ padding: '8px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={pearlDeptFilter} onChange={e => setPearlDeptFilter(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="">All Departments</option>
                {PRESET_DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
              {pearlDeptFilter && (
                <button onClick={() => setPearlDeptFilter('')} style={{ fontSize: 12, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
              )}
            </div>
          )}

          <div style={{ padding: '10px 16px 80px' }}>
            {loading ? <div className="loading">Loading...</div>
              : pearls.length === 0 ? <div className="empty">Pearl collection is empty</div>
              : <div className="list-gap">
                {pearls
                  .filter(pl => {
                    if (pearlStatusFilter === 'starred' && !pl.starred) return false;
                    if (pearlDeptFilter && pl.department !== pearlDeptFilter) return false;
                    return true;
                  })
                  .map(pl => {
                    const isExpanded = expandedPearl === pl.pearl_id;
                    const displayTitle = pl.title || pl.content?.split('\n')[0].replace(/^#+\s*/, '').slice(0, 60);
                    let pressTimer = null;
                    return (
                      <div key={pl.pearl_id}>
                        <div className="card" style={{
                          padding: 0, overflow: 'hidden',
                          borderLeft: pl.starred ? '3px solid #d97706' : '3px solid transparent',
                          outline: selected.has(pl.pearl_id) ? '2px solid var(--blue)' : 'none',
                          userSelect: 'none',
                        }}
                          onContextMenu={e => openMenu(e, 'pearl', pl.pearl_id, pl)}
                          onTouchStart={e => { pressTimer = setTimeout(() => openMenu(e, 'pearl', pl.pearl_id, pl), 600); }}
                          onTouchEnd={() => clearTimeout(pressTimer)}
                          onTouchMove={() => clearTimeout(pressTimer)}
                        >
                          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {selectMode && (
                              <input type="checkbox" checked={selected.has(pl.pearl_id)}
                                onChange={() => toggleSelect(pl.pearl_id)}
                                style={{ width: 16, height: 16, flexShrink: 0, cursor: 'pointer' }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                              onClick={() => selectMode ? toggleSelect(pl.pearl_id) : setEditingPearl({...pl})}>
                              <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {displayTitle}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                                {pl.department}{pl.source ? ` · ${pl.source}` : ''} · {formatDate(pl.created_at)}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setExpandedPearl(isExpanded ? null : pl.pearl_id); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 12, padding: '4px 6px', flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</button>
                          </div>
                          {isExpanded && (
                            <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                              <div className="markdown-body" style={{ paddingTop: 12 }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{pl.content || ''}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>}
          </div>
          {selectMode && selected.size > 0 && (
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, zIndex: 100 }}>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>{selected.size} selected</span>
              <button onClick={bulkStarPearls} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', fontSize: 13 }}>⭐ Star all</button>
              <button onClick={bulkDeletePearls} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Delete</button>
            </div>
          )}
        </div>
      )}

      {contextMenu && (
        <>
          <div onClick={() => setContextMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 160),
            zIndex: 999,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1)',
            minWidth: 170,
            overflow: 'hidden',
            animation: 'ctxIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
            transformOrigin: 'top left',
          }}>
            {contextMenu.type === 'pearl' && <>
              <button onClick={() => { handleStarPearl(contextMenu.id, contextMenu.data.starred); setContextMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: contextMenu.data.starred ? '#92400e' : '#1e293b', textAlign: 'left' }}>
                <span style={{ fontSize: 16 }}>{contextMenu.data.starred ? '★' : '☆'}</span>
                {contextMenu.data.starred ? 'Remove mark' : 'Mark'}
              </button>
              <button onClick={() => { setEditingPearl(pearls.find(p => p.pearl_id === contextMenu.id)); setContextMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: '#1e293b', textAlign: 'left' }}>
                <span style={{ fontSize: 16 }}>✎</span>
                Edit
              </button>
              <button onClick={() => { handleDeletePearl(contextMenu.id); setContextMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626', textAlign: 'left' }}>
                <span style={{ fontSize: 16 }}>⌫</span>
                Delete
              </button>
            </>}
            {contextMenu.type === 'ward' && <>
              {contextMenu.data.status !== 'starred'
                ? <button onClick={() => { handleStatus(contextMenu.id, 'starred'); setContextMenu(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: '#1e293b', textAlign: 'left' }}>
                    <span>★</span> Star
                  </button>
                : <button onClick={() => { handleStatus(contextMenu.id, 'active'); setContextMenu(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: '#92400e', textAlign: 'left' }}>
                    <span>★</span> Unstar
                  </button>
              }
              {contextMenu.data.status !== 'archived'
                ? <button onClick={() => { handleStatus(contextMenu.id, 'archived'); setContextMenu(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: '#1e293b', textAlign: 'left' }}>
                    <span>◫</span> Archive
                  </button>
                : <button onClick={() => { handleStatus(contextMenu.id, 'active'); setContextMenu(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', fontSize: 14, color: '#2563eb', textAlign: 'left' }}>
                    <span>↩</span> Restore
                  </button>
              }
              <button onClick={() => { handleStatus(contextMenu.id, 'deleted'); setContextMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626', textAlign: 'left' }}>
                <span>⌫</span> Delete
              </button>
            </>}
            {contextMenu.type === 'opd' && <>
              <button onClick={() => { setContextMenu(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#dc2626', textAlign: 'left' }}>
                <span>⌫</span> Delete
              </button>
            </>}
          </div>
        </>
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
              <input value={plForm.title} onChange={e => setPlForm({ ...plForm, title: e.target.value })} placeholder="e.g. TUR Syndrome comparison" />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Content * {imageUploading && <span style={{color:'var(--text-tertiary)',fontSize:11}}> uploading...</span>}</label>
                <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
                  {['write','markdown'].map(m => (
                    <button key={m} onClick={() => setEditorMode(m)} style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: editorMode === m ? 'white' : 'transparent',
                      color: editorMode === m ? 'var(--text)' : 'var(--text-tertiary)',
                      border: 'none', cursor: 'pointer',
                    }}>{m === 'write' ? '✏️ Write' : '{ } Markdown'}</button>
                  ))}
                </div>
              </div>
              {editorMode === 'write' && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {[['B','**','**'],['I','*','*'],['H2','## ',''],['H3','### ',''],['• ','- ',''],['—','---\n','']].map(([label,pre,suf]) => (
                    <button key={label} onClick={() => insertFormat(plForm.content, v => setPlForm({...plForm, content: v}), pre, suf)}
                      style={{ padding: '3px 8px', fontSize: 12, fontWeight: label==='B'?700:label==='I'?400:500, fontStyle: label==='I'?'italic':'normal',
                        border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={plForm.content}
                onChange={e => setPlForm({ ...plForm, content: e.target.value })}
                onPaste={e => handlePasteImage(e, plForm.content, v => setPlForm({...plForm, content: v}))}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDropImage(e, plForm.content, v => setPlForm({...plForm, content: v}))}
                placeholder={editorMode === 'markdown' ? 'Paste markdown here...' : 'Write your pearl... use toolbar above for formatting'}
                rows={8} style={{ fontFamily: editorMode === 'markdown' ? 'monospace' : 'inherit', fontSize: 13 }} />
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Content {imageUploading && <span style={{color:'var(--text-tertiary)',fontSize:11}}> uploading...</span>}</label>
                <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
                  {['write','markdown'].map(m => (
                    <button key={m} onClick={() => setEditorMode(m)} style={{
                      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                      background: editorMode === m ? 'white' : 'transparent',
                      color: editorMode === m ? 'var(--text)' : 'var(--text-tertiary)',
                      border: 'none', cursor: 'pointer',
                    }}>{m === 'write' ? '✏️ Write' : '{ } Markdown'}</button>
                  ))}
                </div>
              </div>
              {editorMode === 'write' && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                  {[['B','**','**'],['I','*','*'],['H2','## ',''],['H3','### ',''],['• ','- ',''],['—','---\n','']].map(([label,pre,suf]) => (
                    <button key={label} onClick={() => insertFormat(editingPearl.content || '', v => setEditingPearl({...editingPearl, content: v}), pre, suf)}
                      style={{ padding: '3px 8px', fontSize: 12, fontWeight: label==='B'?700:label==='I'?400:500, fontStyle: label==='I'?'italic':'normal',
                        border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                value={editingPearl.content || ''}
                onChange={e => setEditingPearl({...editingPearl, content: e.target.value})}
                onPaste={e => handlePasteImage(e, editingPearl.content || '', v => setEditingPearl({...editingPearl, content: v}))}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDropImage(e, editingPearl.content || '', v => setEditingPearl({...editingPearl, content: v}))}
                rows={10}
                style={{ fontFamily: editorMode === 'markdown' ? 'monospace' : 'inherit', fontSize: 13 }}
                placeholder={editorMode === 'markdown' ? 'Paste markdown here...' : 'Write your pearl...'} />
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
        .pcard, .card { -webkit-touch-callout: none; }
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
        @keyframes ctxIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        .markdown-body { font-size: 13px; color: var(--text-secondary); line-height: 1.7; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--text); font-weight: 600; margin: 12px 0 6px; font-size: 14px; }
        .markdown-body h1 { font-size: 16px; }
        .markdown-body strong { color: var(--text); font-weight: 600; }
        .markdown-body ul, .markdown-body ol { padding-left: 18px; margin: 6px 0; }
        .markdown-body li { margin: 3px 0; }
        .markdown-body blockquote { border-left: 3px solid var(--blue); padding-left: 10px; margin: 8px 0; color: var(--text-tertiary); }
        .markdown-body hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
        .markdown-body img { max-width: 100%; border-radius: 8px; margin: 8px 0; }
        .markdown-body table { border-collapse: collapse; width: 100%; font-size: 12px; margin: 8px 0; }
        .markdown-body th { background: var(--surface); font-weight: 600; color: var(--text); padding: 6px 10px; border: 1px solid var(--border); text-align: left; }
        .markdown-body td { padding: 5px 10px; border: 1px solid var(--border); }
        .markdown-body tr:nth-child(even) { background: var(--surface); }
        .markdown-body code { background: var(--surface); padding: 1px 5px; border-radius: 4px; font-size: 12px; }
      `}</style>
    </div>
  );
}

function PatientCard({ patient: p, trackingItems, onStatusChange, onOpenMenu }) {
  const age = calcAge(p.birth_date);
  const hd = calcHD(p.admission_date);
  const cls = `pcard${p.status === 'starred' ? ' starred' : p.status === 'archived' ? ' archived' : ''}`;
  const showItems = trackingItems.slice(0, 2);
  let pressTimer = null;

  return (
    <div>
      <div style={{ textDecoration: 'none', display: 'block', userSelect: 'none', WebkitTouchCallout: 'none' }}
        onContextMenu={e => onOpenMenu(e, 'ward', p.patient_id, p)}
        onTouchStart={e => { pressTimer = setTimeout(() => { onOpenMenu(e, 'ward', p.patient_id, p); }, 600); }}
        onTouchEnd={e => { clearTimeout(pressTimer); }}
        onTouchMove={() => clearTimeout(pressTimer)}
      >
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
      </div>
    </div>
  );
}
