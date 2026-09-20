const BASE_URL = '/api/runs';

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) {
    throw new Error(body.error || 'Request failed.');
  }
  return body.data;
}

export function listRuns() {
  return request(BASE_URL);
}

export function getRun(id) {
  return request(`${BASE_URL}/${id}`);
}

export function createRun(suiteId) {
  return request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suite_id: suiteId }),
  });
}

export function updateResult(runId, testCaseId, payload) {
  return request(`${BASE_URL}/${runId}/results/${testCaseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
