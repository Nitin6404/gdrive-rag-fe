import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  UseQueryOptions,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiService } from "../services/api";
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
} from "../types/api";

// Search hooks
export const useSearch = (
  query: string,
  options?: {
    folderId?: string;
    limit?: number;
    cursor?: string;
  },
  queryOptions?: Omit<
    UseQueryOptions<SearchResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["search", query, options],
    queryFn: () => apiService.search(query, options),
    enabled: !!query && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data,
    ...queryOptions,
  });
};

export const useAutocomplete = (
  query: string,
  limit: number = 5,
  queryOptions?: Omit<
    UseQueryOptions<AutocompleteResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["autocomplete", query, limit],
    queryFn: () => apiService.getAutocomplete(query, limit),
    enabled: !!query && query.length > 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...queryOptions,
  });
};

// RAG hooks
export const useRAGQuery = (
  options?: UseMutationOptions<RAGResponse, ApiError, RAGQueryRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RAGQueryRequest) => apiService.ragQuery(request),
    onSuccess: (data, variables) => {
      // Cache the result for potential reuse
      queryClient.setQueryData(["rag", variables.query], data);
    },
    ...options,
  });
};

// Document hooks
export const useDocument = (
  documentId: string,
  queryOptions?: Omit<
    UseQueryOptions<DocumentDetails, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: () => apiService.getDocument(documentId),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...queryOptions,
  });
};

export const useUploadDocument = (
  options?: UseMutationOptions<
    UploadDocumentResponse,
    ApiError,
    UploadDocumentRequest
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UploadDocumentRequest) =>
      apiService.uploadDocument(request),
    onSuccess: () => {
      // Invalidate search results to include new document
      queryClient.invalidateQueries({ queryKey: ["search"] });
    },
    ...options,
  });
};

// Snippet hooks
export const useSnippets = (
  request: SnippetRequest,
  queryOptions?: Omit<
    UseQueryOptions<SnippetResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["snippets", request],
    queryFn: () => apiService.getSnippets(request),
    enabled: !!request.documentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
};

// Utility hook for retrying failed requests
export const useRetryableQuery = <T>(
  queryKey: any[],
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  queryOptions?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">
) => {
  return useQuery({
    queryKey,
    queryFn: () => apiService.retryRequest(queryFn, maxRetries),
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error.code && error.code.startsWith("4")) {
        return false;
      }
      return failureCount < maxRetries;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...queryOptions,
  });
};

// Hook for infinite scroll/pagination
export const useInfiniteSearch = (
  query: string,
  options?: {
    folderId?: string;
    limit?: number;
  }
) => {
  return useQuery({
    queryKey: ["infiniteSearch", query, options],
    queryFn: async ({ pageParam = undefined }) => {
      return apiService.search(query, {
        ...options,
        cursor: pageParam,
      });
    },
    enabled: !!query && query.length > 0,
    staleTime: 5 * 60 * 1000,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
  });
};

// Health Check Hook
export const useHealth = (
  queryOptions?: Omit<
    UseQueryOptions<HealthResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiService.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
    ...queryOptions,
  });
};

// Enhanced Search Hooks
export const useSemanticSearch = (
  request: SemanticSearchRequest,
  queryOptions?: Omit<
    UseQueryOptions<SearchResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["semanticSearch", request],
    queryFn: () => apiService.semanticSearch(request),
    enabled: !!request.query && request.query.length > 0,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSearchSuggestions = (
  query: string,
  limit: number = 5,
  queryOptions?: Omit<
    UseQueryOptions<SearchSuggestionsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["searchSuggestions", query, limit],
    queryFn: () => apiService.getSearchSuggestions(query, limit),
    enabled: !!query && query.length > 1,
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSimilarDocuments = (
  documentId: string,
  limit: number = 10,
  threshold: number = 0.7,
  queryOptions?: Omit<
    UseQueryOptions<SimilarDocumentsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["similarDocuments", documentId, limit, threshold],
    queryFn: () => apiService.getSimilarDocuments(documentId, limit, threshold),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSearchStats = (
  queryOptions?: Omit<
    UseQueryOptions<SearchStatsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["searchStats"],
    queryFn: () => apiService.getSearchStats(),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

// Enhanced Document Management Hooks
export const useDocuments = (
  request?: DocumentListRequest,
  queryOptions?: Omit<
    UseQueryOptions<DocumentListResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["documents", request],
    queryFn: () => apiService.getDocuments(request),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useIndexDocument = (
  options?: UseMutationOptions<
    ApiResponse<any>,
    ApiError,
    { documentId: string; request?: IndexDocumentRequest }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, request }) =>
      apiService.indexDocument(documentId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["indexedDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["searchStats"] });
    },
    ...options,
  });
};

export const useBatchIndexDocuments = (
  options?: UseMutationOptions<ApiResponse<any>, ApiError, BatchIndexRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BatchIndexRequest) =>
      apiService.batchIndexDocuments(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["indexedDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["searchStats"] });
    },
    ...options,
  });
};

export const useRemoveDocumentFromIndex = (
  options?: UseMutationOptions<ApiResponse<any>, ApiError, string>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) =>
      apiService.removeDocumentFromIndex(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["indexedDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["searchStats"] });
    },
    ...options,
  });
};

export const useIndexedDocuments = (
  limit?: number,
  offset?: number,
  fileType?: string,
  queryOptions?: Omit<
    UseQueryOptions<IndexedDocumentsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["indexedDocuments", limit, offset, fileType],
    queryFn: () => apiService.getIndexedDocuments(limit, offset, fileType),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useFolders = (
  parentId?: string,
  limit?: number,
  queryOptions?: Omit<
    UseQueryOptions<FoldersResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["folders", parentId, limit],
    queryFn: () => apiService.getFolders(parentId, limit),
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
    select: (data) => data.data || [],
  });
};

// Enhanced RAG Hooks
export const useMultiStepRAG = (
  options?: UseMutationOptions<RAGResponse, ApiError, MultiStepRAGRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: MultiStepRAGRequest) =>
      apiService.multiStepRAG(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["multiStepRAG", variables.question], data);
    },
    ...options,
  });
};

export const useConversationRAG = (
  options?: UseMutationOptions<RAGResponse, ApiError, ConversationRAGRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: ConversationRAGRequest) =>
      apiService.conversationRAG(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["conversationRAG", variables.sessionId], data);
    },
    ...options,
  });
};

export const useSummarizeDocument = (
  options?: UseMutationOptions<RAGResponse, ApiError, SummarizeRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SummarizeRequest) =>
      apiService.summarizeDocument(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["summarize", variables.documentId], data);
    },
    ...options,
  });
};

export const useCompareDocuments = (
  options?: UseMutationOptions<RAGResponse, ApiError, CompareDocumentsRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CompareDocumentsRequest) =>
      apiService.compareDocuments(request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["compare", variables.documentIds.sort().join(",")],
        data
      );
    },
    ...options,
  });
};

export const useRAGConfig = (
  queryOptions?: Omit<
    UseQueryOptions<RAGConfigResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["ragConfig"],
    queryFn: () => apiService.getRAGConfig(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...queryOptions,
  });
};

// Enhanced Snippets Hooks
export const useDocumentSnippets = (
  documentId: string,
  request?: DocumentSnippetsRequest,
  queryOptions?: Omit<
    UseQueryOptions<DocumentSnippetsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["documentSnippets", documentId, request],
    queryFn: () => apiService.getDocumentSnippets(documentId, request),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSpecificSnippet = (
  documentId: string,
  chunkIndex: number,
  queryOptions?: Omit<
    UseQueryOptions<SpecificSnippetResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["specificSnippet", documentId, chunkIndex],
    queryFn: () => apiService.getSpecificSnippet(documentId, chunkIndex),
    enabled: !!documentId && chunkIndex >= 0,
    staleTime: 15 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSnippetSearch = (
  request: SnippetSearchRequest,
  queryOptions?: Omit<
    UseQueryOptions<SnippetSearchResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["snippetSearch", request],
    queryFn: () => apiService.searchSnippets(request),
    enabled: !!request.query && request.query.length > 0,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
};

export const useRandomSnippets = (
  request?: RandomSnippetsRequest,
  queryOptions?: Omit<
    UseQueryOptions<RandomSnippetsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["randomSnippets", request],
    queryFn: () => apiService.getRandomSnippets(request),
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
};

export const useSnippetStats = (
  queryOptions?: Omit<
    UseQueryOptions<SnippetStatsResponse, ApiError>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["snippetStats"],
    queryFn: () => apiService.getSnippetStats(),
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
  });
};

// Utility hook for managing conversation sessions
export const useConversationSession = (sessionId: string) => {
  const queryClient = useQueryClient();

  const addMessage = (message: {
    role: "user" | "assistant";
    content: string;
  }) => {
    const key = ["conversationHistory", sessionId];
    const history = (queryClient.getQueryData(key) as any[]) || [];
    const newHistory = [
      ...history,
      { ...message, timestamp: new Date().toISOString() },
    ];
    queryClient.setQueryData(key, newHistory);
    return newHistory;
  };

  const getHistory = () => {
    return (
      (queryClient.getQueryData(["conversationHistory", sessionId]) as any[]) ||
      []
    );
  };

  const clearHistory = () => {
    queryClient.setQueryData(["conversationHistory", sessionId], []);
  };

  return { addMessage, getHistory, clearHistory };
};
