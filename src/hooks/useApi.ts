import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiService } from '../services/api';
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
} from '../types/api';

// Search hooks
export const useSearch = (
  query: string,
  options?: {
    folderId?: string;
    limit?: number;
    cursor?: string;
  },
  queryOptions?: Omit<UseQueryOptions<SearchResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['search', query, options],
    queryFn: () => apiService.search(query, options),
    enabled: !!query && query.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });
};

export const useAutocomplete = (
  query: string,
  limit: number = 5,
  queryOptions?: Omit<UseQueryOptions<AutocompleteResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['autocomplete', query, limit],
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
      queryClient.setQueryData(['rag', variables.query], data);
    },
    ...options,
  });
};

// Document hooks
export const useDocument = (
  documentId: string,
  queryOptions?: Omit<UseQueryOptions<DocumentDetails, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiService.getDocument(documentId),
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...queryOptions,
  });
};

export const useUploadDocument = (
  options?: UseMutationOptions<UploadDocumentResponse, ApiError, UploadDocumentRequest>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: UploadDocumentRequest) => apiService.uploadDocument(request),
    onSuccess: () => {
      // Invalidate search results to include new document
      queryClient.invalidateQueries({ queryKey: ['search'] });
    },
    ...options,
  });
};

// Snippet hooks
export const useSnippets = (
  request: SnippetRequest,
  queryOptions?: Omit<UseQueryOptions<SnippetResponse, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['snippets', request],
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
  queryOptions?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey,
    queryFn: () => apiService.retryRequest(queryFn, maxRetries),
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error.code && error.code.startsWith('4')) {
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
    queryKey: ['infiniteSearch', query, options],
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