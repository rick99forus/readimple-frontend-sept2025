import axios from 'axios';

// Possible backend URLs in order of preference
const POSSIBLE_BACKENDS = [
  process.env.REACT_APP_BACKEND_URL, // From .env
  'https://pleasing-gorilla-relaxed.ngrok-free.app', // Your static ngrok
  'http://localhost:5001',           // Localhost fallback
  `http://${window.location.hostname}:5001`, // Dynamic WiFi IP
  'http://192.168.1.221:5001',       // WiFi IP
  'http://10.83.203.132:5001',       // Current WiFi IP
];

let ACTIVE_BACKEND_URL = null;
let testingPromise = null;

// Test if a backend URL is reachable with a simple endpoint
async function testBackendUrl(url) {
  if (!url) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout for mobile
    
    const headers = {
      'Accept': 'application/json',
    };
    
    // Add ngrok header for ngrok URLs
    if (url.includes('ngrok')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    // Test with a simple endpoint that should always work
    const response = await fetch(`${url}/api/books/test`, {
      method: 'GET',
      signal: controller.signal,
      headers: headers,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ Backend test passed for ${url}`);
      return true;
    }
    
    console.log(`❌ Backend test failed for ${url}: ${response.status}`);
    return false;
  } catch (error) {
    console.log(`❌ Backend test failed for ${url}:`, error.message);
    return false;
  }
}

// Find the first working backend URL
async function findWorkingBackend() {
  if (testingPromise) return testingPromise;
  
  testingPromise = (async () => {
    console.log('🔍 Testing backend URLs...');
    
    // For mobile devices, prefer HTTPS ngrok for security
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    let backendsToTest = [...POSSIBLE_BACKENDS];
    
    // If we're on mobile (not localhost), prioritize HTTPS
    if (isMobile || !isLocalhost) {
      backendsToTest = backendsToTest.sort((a, b) => {
        if (a?.includes('https') && !b?.includes('https')) return -1;
        if (!a?.includes('https') && b?.includes('https')) return 1;
        return 0;
      });
    }
    
    for (const url of backendsToTest) {
      if (!url) continue;
      
      console.log(`Testing: ${url}`);
      const isWorking = await testBackendUrl(url);
      
      if (isWorking) {
        console.log(`✅ Found working backend: ${url}`);
        ACTIVE_BACKEND_URL = url;
        localStorage.setItem('lastWorkingBackend', url);
        testingPromise = null;
        return url;
      }
    }
    
    console.error('❌ No working backend found');
    testingPromise = null;
    throw new Error('No backend available');
  })();
  
  return testingPromise;
}

// Get the active backend URL (with caching)
export async function getBackendUrl() {
  if (ACTIVE_BACKEND_URL) {
    return ACTIVE_BACKEND_URL;
  }
  
  // Try last working backend first
  const lastWorking = localStorage.getItem('lastWorkingBackend');
  if (lastWorking && await testBackendUrl(lastWorking)) {
    ACTIVE_BACKEND_URL = lastWorking;
    return lastWorking;
  }
  
  // Find a new working backend
  return await findWorkingBackend();
}

// Enhanced apiCall function with better error handling
export async function apiCall(endpoint, options = {}) {
  let attempt = 0;
  const maxAttempts = 2;
  
  while (attempt < maxAttempts) {
    try {
      const backendUrl = await getBackendUrl();
      console.log(`📡 Using backend (attempt ${attempt + 1}): ${backendUrl}`);

      const url = endpoint.startsWith('http') ? endpoint : `${backendUrl}${endpoint}`;
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add ngrok header for ngrok URLs
      if (backendUrl.includes('ngrok')) {
        headers['ngrok-skip-browser-warning'] = 'true';
      }
      
      const config = {
        method: options.method || 'GET',
        headers: headers,
      };

      // Handle GET requests with params
      if (options.params && config.method === 'GET') {
        const urlObj = new URL(url);
        Object.keys(options.params).forEach(key => {
          urlObj.searchParams.append(key, options.params[key]);
        });
        
        const response = await fetch(urlObj.toString(), config);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return {
          data: await response.json(),
          status: response.status,
        };
      }

      // Handle POST requests with body data
      if (options.data && config.method === 'POST') {
        config.body = JSON.stringify(options.data);
      } else if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
      } else if (options.body) {
        config.body = options.body;
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return {
        data: await response.json(),
        status: response.status,
      };

    } catch (error) {
      console.error(`❌ API call failed for ${endpoint} (attempt ${attempt + 1}):`, error);
      
      // If this was a network error, try to find a new backend
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        ACTIVE_BACKEND_URL = null;
        localStorage.removeItem('lastWorkingBackend');
        attempt++;
        
        if (attempt < maxAttempts) {
          console.log('🔄 Retrying with different backend...');
          continue;
        }
      }
      
      throw error;
    }
  }
};

// Create axios instance with dynamic URL
export const apiClient = axios.create({
  timeout: 15000, // Increased timeout for mobile
});

// Interceptor to set the base URL dynamically
apiClient.interceptors.request.use(async (config) => {
  if (!config.baseURL) {
    try {
      const backendUrl = await getBackendUrl();
      config.baseURL = backendUrl;
      
      // Add ngrok header if needed
      if (backendUrl.includes('ngrok')) {
        config.headers = {
          ...config.headers,
          'ngrok-skip-browser-warning': 'true'
        };
      }
      
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
      ACTIVE_BACKEND_URL = null;
      localStorage.removeItem('lastWorkingBackend');
      
      // Try to find a new working backend
      try {
        await findWorkingBackend();
        // Retry the original request
        return apiClient.request(error.config);
      } catch {
        // All backends failed
      }
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