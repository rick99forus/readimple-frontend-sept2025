import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://readimple.com/api';

export async function apiCall(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.params && config.method === 'GET') {
    const urlObj = new URL(url);
    Object.keys(options.params).forEach(key => {
      urlObj.searchParams.append(key, options.params[key]);
    });
    const response = await fetch(urlObj.toString(), config);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return { data: await response.json(), status: response.status };
  }

  if (options.data && config.method === 'POST') {
    config.body = JSON.stringify(options.data);
  } else if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  const response = await fetch(url, config);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return { data: await response.json(), status: response.status };
}

export async function fetchWithCache(url, options = {}) {
  const res = await apiCall(url, options);
  return res.data || res;
}