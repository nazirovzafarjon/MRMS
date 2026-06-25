const API_BASE = '/api';

export function createApiClient(token, onUnauthorized) {
  async function request(method, url, body, signal) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers, signal };
    if (body !== undefined && body !== null) options.body = JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${url}`, options);

      if (res.status === 401) {
        onUnauthorized?.();
        return null;
      }

      const data = await res.json();
      return data;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      console.error('API request failed:', err);
      return { success: false, message: 'Network error. Is the server running?' };
    }
  }

  return {
    get:  (url, signal)        => request('GET',    url, undefined, signal),
    post: (url, body, signal)  => request('POST',   url, body,      signal),
    put:  (url, body, signal)  => request('PUT',    url, body,      signal),
    del:  (url, signal)        => request('DELETE', url, undefined, signal),
  };
}
