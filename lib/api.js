const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

const headers = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Prefer': 'return=representation',
};

async function query(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers });
  return res.json();
}

async function insert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
}

async function update(table, match, data) {
  const params = '?' + new URLSearchParams(match).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  return res.json();
}

async function remove(table, match) {
  const params = '?' + new URLSearchParams(match).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: 'DELETE',
    headers,
  });
  return res.status;
}

function uid(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
}

// Patients
export async function getPatients() {
  return query('patients', '?order=created_at.desc');
}

export async function addPatient(data) {
  const now = new Date().toISOString();
  return insert('patients', {
    patient_id: uid('P'),
    name: data.name,
    chart_number: data.chart_number || '',
    birth_date: data.birth_date || '',
    gender: data.gender || 'M',
    bed: data.bed || '',
    hospital: data.hospital || '',
    department: data.department || '',
    chief_complaint: data.chief_complaint || '',
    diagnosis: data.diagnosis || '',
    mode: 'ward',
    status: 'active',
    admission_date: data.admission_date || now.slice(0, 10),
    discharge_date: data.discharge_date || '',
    created_at: now,
  });
}

export async function updatePatientStatus(patient_id, status) {
  return update('patients', { patient_id: `eq.${patient_id}` }, { status });
}

// Tracking items
export async function getTrackingItems(patient_id) {
  return query('tracking_items', `?patient_id=eq.${patient_id}&order=created_at.asc`);
}

export async function getAllTrackingItems() {
  return query('tracking_items', '?order=created_at.asc');
}

export async function addTrackingItem(patient_id, content) {
  return insert('tracking_items', {
    item_id: uid('T'),
    patient_id,
    content,
    created_at: new Date().toISOString(),
  });
}

export async function deleteTrackingItem(item_id) {
  return remove('tracking_items', { item_id: `eq.${item_id}` });
}

// SOAP
export async function getSOAP(patient_id, date) {
  return query('soap_records', `?patient_id=eq.${patient_id}&date=eq.${date}&order=timestamp.desc`);
}

export async function addSOAP(data) {
  const now = new Date().toISOString();
  return insert('soap_records', {
    record_id: uid('S'),
    patient_id: data.patient_id,
    date: data.date || now.slice(0, 10),
    timestamp: now,
    subjective: data.subjective || '',
    objective: data.objective || '',
    assessment: data.assessment || '',
    plan: data.plan || '',
  });
}

// OPD
export async function getOPDVisits() {
  return query('opd_visits', '?order=date.desc');
}

export async function addOPDVisit(data) {
  return insert('opd_visits', {
    visit_id: uid('O'),
    date: data.date || new Date().toISOString().slice(0, 10),
    hospital: data.hospital || '',
    department: data.department || '',
    chief_complaint: data.chief_complaint || '',
    diagnosis: data.diagnosis || '',
    impression: data.impression || '',
    learning_point: data.learning_point || '',
    created_at: new Date().toISOString(),
  });
}

// Pearls
export async function getPearls() {
  return query('pearls', '?order=created_at.desc');
}

export async function addPearl(data) {
  return insert('pearls', {
    pearl_id: uid('PL'),
    source: data.source || '',
    department: data.department || '',
    content: data.content,
    created_at: new Date().toISOString(),
  });
}

// Cases
export async function getCases() {
  return query('cases', '?order=created_at.desc');
}

export async function saveCase(data) {
  return insert('cases', {
    case_id: uid('CS'),
    patient_id: data.patient_id || '',
    visit_id: data.visit_id || '',
    title: data.title,
    story: data.story || '',
    key_turning_point: data.key_turning_point || '',
    learning_points: data.learning_points || '',
    created_at: new Date().toISOString(),
  });
}

// Helpers
export function calcAge(birth_date) {
  if (!birth_date) return '?';
  const today = new Date();
  const birth = new Date(birth_date);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function calcHD(admission_date) {
  if (!admission_date) return null;
  const adm = new Date(admission_date);
  const now = new Date();
  return Math.floor((now - adm) / 86400000);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}
