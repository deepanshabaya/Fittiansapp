// Use Expo public env var when available (set in fitness-mobile-new/.env).
// Fallback is localhost for local emulator/dev use.
const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. Check backend/tunnel URL.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse(response) {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!response.ok) {
    console.log("API ERROR STATUS:", response.status);
    console.log("API ERROR BODY:", data);

    let message = 'Request failed';

    if (data?.errors && Array.isArray(data.errors)) {
      message = data.errors.map(e => e.msg).join(', ');
    } else if (data?.message) {
      message = data.message;
    }

    throw new Error(message);
  }

  return data;
}

// ────────────────────────────────────────────────────────
// Auth APIs
// ────────────────────────────────────────────────────────

/**
 * Login — email + optional password. Role is auto-detected from the DB.
 */
export async function login({ email, password }) {
  console.log("BASE_URL:", BASE_URL);
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return handleResponse(res);
}

export async function register({ mobile, email, password }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, email, password }),
  });

  return handleResponse(res);
}

/**
 * Check if a user exists by email. Returns { exists: boolean, role?: string }.
 */
export async function checkUserExists({ email }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/auth/check-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res);
}

// ────────────────────────────────────────────────────────
// Admin APIs
// ────────────────────────────────────────────────────────

/**
 * Admin: create a new user (trainer or customer).
 * Sends multipart/form-data to support image uploads.
 *
 * @param {object} params
 * @param {string} params.token - admin JWT
 * @param {string} params.role - 'trainer' | 'customer'
 * @param {object} params.formData - all form fields
 * @param {object|null} params.imageUri - local URI of image file (or null)
 * @param {string} params.imageFieldName - 'upload_photo' or 'profile'
 */
export async function adminCreateUser({ token, role, formData, imageUri, imageFieldName }) {
  const body = new FormData();

  // Append all text fields
  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      body.append(key, String(value));
    }
  });

  // Append role
  body.append('role', role);

  // Append image if provided
  if (imageUri && imageFieldName) {
    const filename = imageUri.split('/').pop();
    const ext = filename.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    body.append(imageFieldName, {
      uri: imageUri,
      name: filename,
      type: mimeType,
    });
  }

  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/create-user`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Do NOT set Content-Type — fetch sets it with the correct boundary for FormData
    },
    body,
  }, 15000); // slightly longer timeout for file uploads

  return handleResponse(res);
}

// ────────────────────────────────────────────────────────
// Admin — Edit User APIs
// ────────────────────────────────────────────────────────

/**
 * Fetch all customers + trainers (basic list for edit picker).
 */
export async function fetchAllUsers({ token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/all-users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

/**
 * Fetch full details for a single customer or trainer.
 */
export async function fetchUserDetails({ token, role, id }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/user-details/${role}/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

/**
 * Update a customer or trainer. Sends multipart/form-data to support photo uploads.
 */
export async function adminUpdateUser({ token, role, id, formData, imageUri, imageFieldName }) {
  const body = new FormData();

  Object.entries(formData).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      body.append(key, String(value));
    }
  });

  if (imageUri && imageFieldName) {
    const filename = imageUri.split('/').pop();
    const ext = filename.split('.').pop();
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
    body.append(imageFieldName, { uri: imageUri, name: filename, type: mimeType });
  }

  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/update-user/${role}/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body,
  }, 15000);

  return handleResponse(res);
}

// ────────────────────────────────────────────────────────
// Admin — Trainer-Customer Mapping APIs
// ────────────────────────────────────────────────────────

/**
 * Fetch all customers with their current mapping status.
 */
export async function fetchCustomersForMapping({ token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/customers-for-mapping`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

/**
 * Fetch all trainers (for admin picker).
 */
export async function fetchTrainersList({ token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/trainers-list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

/**
 * Map (or re-map) a trainer to a customer.
 */
export async function mapTrainerToCustomer({ token, trainerId, customerId }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/admin/mapTrainer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ trainerId, customerId }),
  });
  return handleResponse(res);
}

// ────────────────────────────────────────────────────────
// Trainer / Session / Attendance APIs (unchanged)
// ────────────────────────────────────────────────────────

export async function fetchMyCustomers({ token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/trainers/my-customers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function updateCustomerHealth({ token, customerId, fields }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/trainers/customers/${customerId}/health`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  return handleResponse(res);
}

export async function updateMyTrainerProfile({ token, fields }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/trainers/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(fields),
  });
  return handleResponse(res);
}

export async function fetchTrainerForCustomer({ customerId, token }) {
  const res = await fetchWithTimeout(
    `${BASE_URL}/api/trainers/by-customer/${customerId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return handleResponse(res);
}

export async function fetchAttendance({ customerId, token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/attendance/${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function postponeSession({ sessionId, newDate, newStartTime, newEndTime, token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/sessions/postpone`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, newDate, newStartTime, newEndTime }),
  });
  return handleResponse(res);
}

export async function cancelSession({ sessionId, token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/sessions/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId }),
  });
  return handleResponse(res);
}

export async function pauseSessions({ programId, pauseUntilDate, reason, token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/pause/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ programId, pauseUntilDate, reason }),
  });
  return handleResponse(res);
}

// Customer postpones a daily session (writes to customer_sessions).
export async function postponeDailySession({ token, session_date }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/session/postpone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_date }),
  });
  return handleResponse(res);
}

// Customer cancels a daily session (writes to customer_sessions).
export async function cancelDailySession({ token, session_date }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/session/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_date }),
  });
  return handleResponse(res);
}

// ────────────────────────────────────────────────────────
// Dashboard / Sessions / Progress / Steps APIs
// ────────────────────────────────────────────────────────

export async function fetchCustomerDashboard({ token, customerId }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/customer/${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function markSession({ token, customer_id, status, session_date }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/session/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ customer_id, status, session_date }),
  });
  return handleResponse(res);
}

export async function addProgress({ token, customer_id, log_date, fields }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/progress/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ customer_id, log_date, ...fields }),
  });
  return handleResponse(res);
}

export async function fetchLatestProgress({ token, customerId }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/progress/${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function syncSteps({ token, steps_per_day, date }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/health/steps/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ steps_per_day, date }),
  });
  return handleResponse(res);
}

export async function fetchTodaySessions({ token, trainerId }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/dashboard/sessions/today/${trainerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function fetchMyTrainerProfile({ token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/trainers/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}

export async function fetchCustomerProgramSummary({ customerId, token }) {
  const res = await fetchWithTimeout(`${BASE_URL}/api/customer-programs/${customerId}/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
}
