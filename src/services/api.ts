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
} from '../types';

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
    const response = await this.api.post('/search/', {
      query,
      ...options,
    });
    return response.data;
  }

  async getAutocomplete(query: string, limit: number = 5): Promise<AutocompleteResponse> {
    const response = await this.api.post('/search/suggestions', {
      query,
      limit,
      autocomplete: true,
    });
    return response.data;
  }

  // RAG endpoints
  async ragQuery(request: RAGQueryRequest): Promise<RAGResponse> {
    const response = await this.api.post('/rag/query', request);
    return response.data;
  }

  // Document endpoints
  async getDocument(documentId: string): Promise<DocumentDetails> {
    const response = await this.api.get(`/documents/${documentId}`);
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

    const response = await this.api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Snippet endpoints
  async getSnippets(request: SnippetRequest): Promise<SnippetResponse> {
    const response = await this.api.post('/snippets', request);
    return response.data;
  }

  // Health Check
  async getHealth(): Promise<HealthResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // Enhanced Search endpoints
  async semanticSearch(request: SemanticSearchRequest): Promise<SearchResponse> {
    const response = await this.api.post('/search/semantic', request);
    return response.data;
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<SearchSuggestionsResponse> {
    const response = await this.api.get(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
    return response.data;
  }

  async getSimilarDocuments(documentId: string, limit: number = 10, threshold: number = 0.7): Promise<SimilarDocumentsResponse> {
    const response = await this.api.get(`/search/similar/${documentId}?limit=${limit}&threshold=${threshold}`);
    return response.data;
  }

  async getSearchStats(): Promise<SearchStatsResponse> {
    const response = await this.api.get('/search/stats');
    return response.data;
  }

  // Enhanced Document Management
  async getDocuments(request?: DocumentListRequest): Promise<DocumentListResponse> {
    const params = new URLSearchParams();
    if (request?.folderId) params.append('folderId', request.folderId);
    if (request?.fileType) params.append('fileType', request.fileType);
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.pageToken) params.append('pageToken', request.pageToken);
    
    const response = await this.api.get(`/documents?${params.toString()}`);
    return response.data;
  }

  async indexDocument(documentId: string, request?: IndexDocumentRequest): Promise<ApiResponse<any>> {
    const response = await this.api.post(`/documents/${documentId}/index`, request || {});
    return response.data;
  }

  async batchIndexDocuments(request: BatchIndexRequest): Promise<ApiResponse<any>> {
    const response = await this.api.post('/documents/batch/index', request);
    return response.data;
  }

  async removeDocumentFromIndex(documentId: string): Promise<ApiResponse<any>> {
    const response = await this.api.delete(`/documents/${documentId}/index`);
    return response.data;
  }

  async getIndexedDocuments(limit?: number, offset?: number, fileType?: string): Promise<IndexedDocumentsResponse> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (fileType) params.append('fileType', fileType);
    
    const response = await this.api.get(`/documents/indexed?${params.toString()}`);
    return response.data;
  }

  async getFolders(parentId?: string, limit?: number): Promise<FoldersResponse> {
    const params = new URLSearchParams();
    if (parentId) params.append('parentId', parentId);
    if (limit) params.append('limit', limit.toString());
    
    const response = await this.api.get(`/documents/folders?${params.toString()}`);
    return response.data;
  }

  // Enhanced RAG endpoints
  async multiStepRAG(request: MultiStepRAGRequest): Promise<RAGResponse> {
    const response = await this.api.post('/rag/multi-step', request);
    return response.data;
  }

  async conversationRAG(request: ConversationRAGRequest): Promise<RAGResponse> {
    const response = await this.api.post('/rag/conversation', request);
    return response.data;
  }

  async summarizeDocument(request: SummarizeRequest): Promise<RAGResponse> {
    const response = await this.api.post('/rag/summarize', request);
    return response.data;
  }

  async compareDocuments(request: CompareDocumentsRequest): Promise<RAGResponse> {
    const response = await this.api.post('/rag/compare', request);
    return response.data;
  }

  async getRAGConfig(): Promise<RAGConfigResponse> {
    const response = await this.api.get('/rag/config');
    return response.data;
  }

  // Enhanced Snippets endpoints
  async getDocumentSnippets(documentId: string, request?: DocumentSnippetsRequest): Promise<DocumentSnippetsResponse> {
    const params = new URLSearchParams();
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.offset) params.append('offset', request.offset.toString());
    if (request?.includeText !== undefined) params.append('includeText', request.includeText.toString());
    
    const response = await this.api.get(`/snippets/${documentId}?${params.toString()}`);
    return response.data;
  }

  async getSpecificSnippet(documentId: string, chunkIndex: number): Promise<SpecificSnippetResponse> {
    const response = await this.api.get(`/snippets/${documentId}/${chunkIndex}`);
    return response.data;
  }

  async searchSnippets(request: SnippetSearchRequest): Promise<SnippetSearchResponse> {
    const response = await this.api.post('/snippets/search', request);
    return response.data;
  }

  async getRandomSnippets(request?: RandomSnippetsRequest): Promise<RandomSnippetsResponse> {
    const params = new URLSearchParams();
    if (request?.count) params.append('count', request.count.toString());
    if (request?.fileTypes) request.fileTypes.forEach(type => params.append('fileTypes', type));
    if (request?.minLength) params.append('minLength', request.minLength.toString());
    
    const response = await this.api.get(`/snippets/random/sample?${params.toString()}`);
    return response.data;
  }

  async getSnippetStats(): Promise<SnippetStatsResponse> {
    const response = await this.api.get('/snippets/stats/overview');
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