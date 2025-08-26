import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import type {
  SearchResponse,
  RAGQueryRequest,
  RAGResponse,
  DocumentDetails,
  SnippetRequest,
  SnippetResponse,
  AutocompleteResponse,
  UploadDocumentRequest,
  UploadDocumentResponse,
  ApiError,
  HealthResponse,
  SemanticSearchRequest,
  SearchSuggestionsResponse,
  SimilarDocumentsResponse,
  SearchStatsResponse,
  DocumentListRequest,
  DocumentListResponse,
  IndexDocumentRequest,
  BatchIndexRequest,
  IndexedDocumentsResponse,
  FoldersResponse,
  MultiStepRAGRequest,
  ConversationRAGRequest,
  SummarizeRequest,
  CompareDocumentsRequest,
  RAGConfigResponse,
  DocumentSnippetsRequest,
  DocumentSnippetsResponse,
  SpecificSnippetResponse,
  SnippetSearchRequest,
  SnippetSearchResponse,
  RandomSnippetsRequest,
  RandomSnippetsResponse,
  SnippetStatsResponse,
  ApiResponse,
} from '../types/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        const apiError: ApiError = {
          message: error.message || 'An unexpected error occurred',
          code: error.code || 'UNKNOWN_ERROR',
          details: error.response?.data,
        };

        // Handle specific error cases
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login or refresh token
          localStorage.removeItem('authToken');
          apiError.message = 'Authentication required';
        } else if (error.response?.status === 403) {
          apiError.message = 'Access forbidden';
        } else if (error.response?.status === 404) {
          apiError.message = 'Resource not found';
        } else if (error?.response?.status >= 500) {
          apiError.message = 'Server error. Please try again later.';
        }

        return Promise.reject(apiError);
      }
    );
  }

  // Search endpoints
  async search(query: string, options?: {
    folderId?: string;
    limit?: number;
    cursor?: string;
  }): Promise<SearchResponse> {
    const response = await this.api.post('/api/search', {
      query,
      ...options,
    });
    return response.data;
  }

  async getAutocomplete(query: string, limit: number = 5): Promise<AutocompleteResponse> {
    const response = await this.api.post('/api/search', {
      query,
      limit,
      autocomplete: true,
    });
    return response.data;
  }

  // RAG endpoints
  async ragQuery(request: RAGQueryRequest): Promise<RAGResponse> {
    const response = await this.api.post('/api/rag/query', request);
    return response.data;
  }

  // Document endpoints
  async getDocument(documentId: string): Promise<DocumentDetails> {
    const response = await this.api.get(`/api/documents/${documentId}`);
    return response.data;
  }

  async uploadDocument(request: UploadDocumentRequest): Promise<UploadDocumentResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.folderId) {
      formData.append('folderId', request.folderId);
    }
    if (request.metadata) {
      formData.append('metadata', JSON.stringify(request.metadata));
    }

    const response = await this.api.post('/api/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Snippet endpoints
  async getSnippets(request: SnippetRequest): Promise<SnippetResponse> {
    const response = await this.api.post('/api/snippets', request);
    return response.data;
  }

  // Utility method for retrying failed requests
  async retryRequest<T>(requestFn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: ApiError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as ApiError;
        
        // Don't retry on client errors (4xx)
        if (lastError.code && lastError.code.startsWith('4')) {
          throw lastError;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError!;
  }
}

export const apiService = new ApiService();
export default apiService;