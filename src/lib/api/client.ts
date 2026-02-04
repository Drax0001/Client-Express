/**
 * API Client - Axios-based HTTP client for backend API communication
 * Handles authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import { ApiError, isApiError } from "./types";

// ======================================
// CONFIGURATION
// ======================================

/**
 * API base URL - /api for Next.js API routes
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 120000; // 120 seconds - increased to allow longer LLM responses

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    return (
      !error.response || // Network error
      (error.response.status >= 500 && error.response.status < 600) // Server error
    );
  },
};

// ======================================
// AXIOS CLIENT SETUP
// ======================================

/**
 * Create and configure Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// ======================================
// REQUEST INTERCEPTORS
// ======================================

/**
 * Request interceptor - add authentication headers, logging, etc.
 */
apiClient.interceptors.request.use(
  (config) => {
    // When sending FormData, do not set Content-Type so the browser sets
    // multipart/form-data with the correct boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    // Log requests in development
    if (process.env.NODE_ENV === "development") {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// ======================================
// RESPONSE INTERCEPTORS
// ======================================

/**
 * Response interceptor - handle common response processing
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log responses in development
    if (process.env.NODE_ENV === "development") {
      console.log(
        `API Response: ${
          response.status
        } ${response.config.method?.toUpperCase()} ${response.config.url}`,
      );
    }

    return response;
  },
  async (error: unknown) => {
    const axiosError = error as AxiosError;

    // Handle retries for eligible errors (only for Axios errors)
    if (
      axiosError?.config &&
      RETRY_CONFIG.retryCondition(axiosError) &&
      shouldRetry(axiosError)
    ) {
      return handleRetry(axiosError);
    }

    // Transform to consistent format (Axios error or generic)
    const transformedError =
      axiosError?.response !== undefined || axiosError?.config !== undefined
        ? transformError(axiosError)
        : ({
            error: {
              code: "UNKNOWN_ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "An unexpected error occurred",
              details: undefined,
            },
          } satisfies ApiError);

    // Log serializable details so we always see useful output (avoids {} from non-enumerable props)
    const logPayload = {
      url: axiosError?.config?.url,
      method: axiosError?.config?.method?.toUpperCase(),
      status: axiosError?.response?.status,
      responseData: axiosError?.response?.data,
      message: error instanceof Error ? error.message : String(error),
    };
    console.error("API Error:", JSON.stringify(logPayload, null, 2));
    console.error(
      "Transformed error:",
      JSON.stringify(transformedError, null, 2),
    );

    return Promise.reject(transformedError);
  },
);

// ======================================
// RETRY LOGIC
// ======================================

/**
 * Track retry attempts per request
 */
const retryAttempts = new Map<string, number>();

/**
 * Generate unique key for request retry tracking
 */
function getRetryKey(error: AxiosError): string {
  const config = error.config;
  return `${config?.method}-${config?.url}-${config?.data || ""}`;
}

/**
 * Check if request should be retried
 */
function shouldRetry(error: AxiosError): boolean {
  const key = getRetryKey(error);
  const attempts = retryAttempts.get(key) || 0;

  if (attempts >= RETRY_CONFIG.maxRetries) {
    retryAttempts.delete(key);
    return false;
  }

  retryAttempts.set(key, attempts + 1);
  return true;
}

/**
 * Handle retry with exponential backoff
 */
async function handleRetry(error: AxiosError): Promise<any> {
  const key = getRetryKey(error);
  const attempts = retryAttempts.get(key) || 1;

  const delay = RETRY_CONFIG.retryDelay * Math.pow(2, attempts - 1);

  console.log(
    `Retrying request (attempt ${attempts}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`,
  );

  await new Promise((resolve) => setTimeout(resolve, delay));

  const config = error.config;
  if (config) {
    return apiClient.request(config);
  }

  throw error;
}

// ======================================
// ERROR TRANSFORMATION
// ======================================

/**
 * Transform Axios errors to consistent ApiError format
 */
function transformError(error: AxiosError): ApiError {
  if (error.response?.data && isApiError(error.response.data)) {
    // Backend returned structured error
    return error.response.data;
  }

  // Transform Axios error to ApiError format
  let code = "UNKNOWN_ERROR";
  let message = "An unexpected error occurred";

  if (error.code === "ECONNABORTED") {
    code = "TIMEOUT";
    message = "Request timed out. Please try again.";
  } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    code = "NETWORK_ERROR";
    message =
      "Unable to connect to the server. Please check your internet connection.";
  } else if (error.response) {
    // Server responded with error status
    const status = error.response.status;
    code = `HTTP_${status}`;

    switch (status) {
      case 400:
        message = "Invalid request. Please check your input.";
        break;
      case 401:
        message = "Authentication required.";
        break;
      case 403:
        message = "Access denied.";
        break;
      case 404:
        message = "The requested resource was not found.";
        break;
      case 409:
        message = "A conflict occurred with the current state.";
        break;
      case 422:
        message = "Validation failed. Please check your input.";
        break;
      case 429:
        message = "Too many requests. Please try again later.";
        break;
      case 500:
        message = "Internal server error. Please try again later.";
        break;
      case 502:
      case 503:
      case 504:
        message = "Service temporarily unavailable. Please try again later.";
        break;
      default:
        message = `Server error (${status}). Please try again.`;
    }
  } else if (error.request) {
    // Network error
    code = "NETWORK_ERROR";
    message = "Network error. Please check your internet connection.";
  }

  return {
    error: {
      code,
      message,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    },
  };
}

// ======================================
// EXPORT
// ======================================

export { apiClient };
export default apiClient;
