import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => {
    // Standardize response payload so that both response.data and response.data.data always work transparently
    if (response.data && typeof response.data === 'object') {
      if (!('data' in response.data)) {
        try {
          Object.defineProperty(response.data, 'data', {
            get() {
              return this;
            },
            enumerable: false,
            configurable: true,
          });
        } catch {
          // In case response.data is frozen
        }
      }
    }
    return response;
  },
  (error) => {
    // Standard error logging without alerting or modal blocking
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);
