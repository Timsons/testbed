const BASE_URL = '/api/test-cases';

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || 'Request failed.');
  }
  return body.data;
}

function buildQuery(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ).toString();
}

export function listTestCases(params = {}) {
  return request(`${BASE_URL}?${buildQuery(params)}`);
}

export function createTestCase(payload) {
  return request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateTestCase(id, payload) {
  return request(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteTestCase(id) {
  return request(`${BASE_URL}/${id}`, { method: 'DELETE' });
}

export function previewTestCaseImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  // No Content-Type header here — the browser sets the multipart boundary itself.
  return request(`${BASE_URL}/import/preview`, {
    method: 'POST',
    body: formData,
  });
}

export function commitTestCaseImport(rows) {
  return request(`${BASE_URL}/import/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
}

export function getTestCaseExportUrl(params = {}) {
  return `${BASE_URL}/export?${buildQuery(params)}`;
}
