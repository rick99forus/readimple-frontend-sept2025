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

// Create axios instance with dynamic URL
export const apiClient = axios.create({
  timeout: 15000, // Increased timeout for mobile
});

// Interceptor to set the base URL dynamically
apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    try {
      const backendUrl = BASE_URL;
      config.baseURL = backendUrl;
      
      console.log(`📡 Using backend: ${backendUrl}`);
    } catch (error) {
      console.error('Failed to get backend URL:', error);
      throw new Error('Backend unavailable');
    }
  }
  return config;
});

// Response interceptor to handle backend failures
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'NETWORK_ERROR' || error.response?.status >= 500) {
      console.log('Backend failed, trying to find alternative...');
      
      // All backends failed
    }
    return Promise.reject(error);
  }
);

// Convenience method for axios-style calls (for backward compatibility)
export async function apiCallAxios(endpoint, options = {}) {
  try {
    const response = await apiClient({
      url: endpoint,
      ...options,
    });
    return response;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

export async function fetchWithCache(url, options = {}) {
  const res = await apiCall(url, options);
  return res.data || res;
}