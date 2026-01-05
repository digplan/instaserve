// GET, POST, PUT, DELETE requests to the server

window.api = {
  get: async (key) => {
    const response = await fetch(`/api?key=${key}`, { credentials: 'include' });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  post: async (key, value) => {
    const response = await fetch(`/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ key, value })
    });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  put: async (key, value) => {
    const response = await fetch(`/api`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ key, value })
    });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  delete: async (key) => {
    const response = await fetch(`/api?key=${key}`, {
      method: "DELETE",
      credentials: 'include'
    });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  all: async () => {
    const response = await fetch(`/all`, { credentials: 'include' });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  files: async () => {
    const response = await fetch(`/files`, {
      method: "POST",
      credentials: 'include'
    });
    return { ok: response.ok, status: response.status, data: await response.json() };
  },
  sse: () => {
    return new EventSource('/sse');
  },
  checkAuth: async () => {
    try {
      const response = await fetch('/api?key=test', { credentials: 'include' });
      return { authenticated: response.status !== 401, status: response.status };
    } catch (e) {
      return { authenticated: false, error: e.message };
    }
  }
};