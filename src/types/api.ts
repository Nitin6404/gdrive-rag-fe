export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  documentName: string;
  folderName?: string;
  dateIndexed: string;
  driveUrl: string;
  score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface RAGQueryRequest {
  query: string;
  folderId?: string;
  contextType?: "folder" | "document";
  maxResults?: number;
}

export interface RAGSource {
  id: string;
  title: string;
  snippet: string;
  driveUrl: string;
  relevanceScore: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  conversationId?: string;
}

export interface DocumentDetails {
  id: string;
  title: string;
  content: string;
  metadata: {
    owner: string;
    dateCreated: string;
    dateModified: string;
    fileType: string;
    size: number;
  };
  driveUrl: string;
}

export interface SnippetRequest {
  documentId: string;
  query?: string;
  maxSnippets?: number;
}

export interface Snippet {
  text: string;
  startIndex: number;
  endIndex: number;
  relevanceScore?: number;
}

export interface SnippetResponse {
  snippets: Snippet[];
  documentTitle: string;
  documentUrl: string;
}

export interface AutocompleteResponse {
  suggestions: string[];
}

export interface UploadDocumentRequest {
  file: File;
  folderId?: string;
  metadata?: Record<string, any>;
}

export interface UploadDocumentResponse {
  documentId: string;
  status: "success" | "processing" | "error";
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  details?: any;
}

// Health Check
export interface HealthResponse {
  status: string;
  timestamp: string;
}

// Search Types
export interface SemanticSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  documentIds?: string[];
  fileTypes?: string[];
}

export interface SearchSuggestionsResponse {
  suggestions: string[];
}

export interface SimilarDocumentsResponse {
  documents: SearchResult[];
  total: number;
}

export interface SearchStatsResponse {
  totalDocuments: number;
  indexedDocuments: number;
  totalChunks: number;
  averageProcessingTime: number;
  lastIndexUpdate: string;
}

// Document Management Types
export interface DocumentListRequest {
  folderId?: string;
  fileType?: string;
  limit?: number;
  pageToken?: string;
}

export interface DocumentListResponse {
  documents: DocumentDetails[];
  nextPageToken?: string;
  total: number;
}

export interface IndexDocumentRequest {
  force?: boolean;
}

export interface BatchIndexRequest {
  documentIds: string[];
  force?: boolean;
}

export interface IndexedDocumentsResponse {
  documents: DocumentDetails[];
  total: number;
  limit: number;
  offset: number;
}

export interface FoldersResponse {
  success: boolean;
  data: {
    folders: Array<{
      id: string;
      name: string;
      parentId?: string;
      childCount: number;
    }>;
  };
  total: number;
}

// RAG Types
export interface ConversationHistory {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface MultiStepRAGRequest {
  question: string;
  maxSteps?: number;
}

export interface ConversationRAGRequest {
  sessionId: string;
  message: string;
  conversationHistory?: ConversationHistory[];
}

export interface SummarizeRequest {
  documentId: string;
  summaryType?: "brief" | "detailed" | "bullet-points";
}

export interface CompareDocumentsRequest {
  documentIds: string[];
  comparisonAspect?: string;
  focusAreas?: string[];
}

export interface RAGConfigResponse {
  modelInfo: {
    name: string;
    version: string;
    maxTokens: number;
  };
  limits: {
    maxDocuments: number;
    maxQueryLength: number;
    maxConversationHistory: number;
  };
  supportedFeatures: string[];
}

// Snippets Types
export interface DocumentSnippetsRequest {
  limit?: number;
  offset?: number;
  includeText?: boolean;
}

export interface DocumentSnippetsResponse {
  snippets: Array<{
    chunkIndex: number;
    text: string;
    startPosition: number;
    endPosition: number;
    metadata: Record<string, any>;
  }>;
  total: number;
  documentTitle: string;
}

export interface SpecificSnippetResponse {
  snippet: {
    chunkIndex: number;
    text: string;
    startPosition: number;
    endPosition: number;
    metadata: Record<string, any>;
  };
  context: {
    previousChunk?: string;
    nextChunk?: string;
  };
  documentTitle: string;
}

export interface SnippetSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  documentIds?: string[];
  fileTypes?: string[];
}

export interface SnippetSearchResponse {
  snippets: Array<{
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    text: string;
    relevanceScore: number;
    metadata: Record<string, any>;
  }>;
  total: number;
}

export interface RandomSnippetsRequest {
  count?: number;
  fileTypes?: string[];
  minLength?: number;
}

export interface RandomSnippetsResponse {
  snippets: Array<{
    documentId: string;
    documentTitle: string;
    text: string;
    metadata: Record<string, any>;
  }>;
}

export interface SnippetStatsResponse {
  totalSnippets: number;
  averageSnippetLength: number;
  distributionByFileType: Record<string, number>;
  processingMetrics: {
    averageProcessingTime: number;
    successRate: number;
  };
}

// Common API Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
