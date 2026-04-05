const API = process.env.NEXT_PUBLIC_API_URL;

async function get(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${API}?${query}`);
  return res.json();
}

async function post(action, data = {}) {
  const res = await fetch(API, {
    method: 'POST',
    body: JSON.stringify({ action, ...data }),
  });
  return res.json();
}

// Patients
export const getPatients = () => get('getPatients');
export const addPatient = (data) => post('addPatient', data);
export const updatePatientStatus = (patient_id, status) =>
  post('updatePatientStatus', { patient_id, status });

// Tracking items
export const getTrackingItems = (patient_id) =>
  get('getTrackingItems', { patient_id });
export const getAllTrackingItems = () => get('getTrackingItems', {});
export const addTrackingItem = (patient_id, content) =>
  post('addTrackingItem', { patient_id, content });
export const deleteTrackingItem = (item_id) =>
  post('deleteTrackingItem', { item_id });

// SOAP
export const getSOAP = (patient_id, date) =>
  get('getSOAP', { patient_id, date });
export const addSOAP = (data) => post('addSOAP', data);

// OPD
export const getOPDVisits = () => get('getOPDVisits');
export const addOPDVisit = (data) => post('addOPDVisit', data);

// Pearls
export const getPearls = () => get('getPearls');
export const addPearl = (data) => post('addPearl', data);

// Cases
export const getCases = () => get('getCases');
export const saveCase = (data) => post('saveCase', data);

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
  return new Date(iso).toLocaleDateString('zh-TW', {
    month: 'short', day: 'numeric',
  });
}
