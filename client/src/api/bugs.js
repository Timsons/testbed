const BASE_URL = '/api/bugs';

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || 'Request failed.');
  }
  return body.data;
}

export function listBugs(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
  ).toString();
  return request(`${BASE_URL}?${query}`);
}

export function getBug(id) {
  return request(`${BASE_URL}/${id}`);
}

export function createBug(payload) {
  return request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function updateBug(id, payload) {
  return request(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteBug(id) {
  return request(`${BASE_URL}/${id}`, { method: 'DELETE' });
}

export function changeBugStatus(id, status, message) {
  return request(`${BASE_URL}/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, message }),
  });
}

export function addBugComment(id, message) {
  return request(`${BASE_URL}/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

export function uploadBugScreenshots(bugId, files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  // No Content-Type header — the browser sets the multipart boundary itself.
  return request(`${BASE_URL}/${bugId}/screenshots`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteBugScreenshot(bugId, screenshotId) {
  return request(`${BASE_URL}/${bugId}/screenshots/${screenshotId}`, { method: 'DELETE' });
}

export function getBugScreenshotUrl(bugId, screenshotId) {
  return `${BASE_URL}/${bugId}/screenshots/${screenshotId}`;
}
