import React, { useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Calendar,
  Folder,
  BarChart3,
  Shuffle,
  TrendingUp,
} from "lucide-react";
import type { SearchResult } from "../types/api";
import { cn } from "../lib/utils";
import { ResultsListSkeleton } from "./LoadingSkeletons";
import { ErrorDisplay, EmptyState } from "./ErrorBoundary";
import { useSimilarDocuments, useSearchStats } from "../hooks/useApi";

interface ResultsListProps {
  results: SearchResult[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onResultClick?: (result: SearchResult) => void;
  searchQuery?: string;
  className?: string;
  error?: Error | null;
  onRetry?: () => void;
  showStats?: boolean;
  showSimilar?: boolean;
  selectedDocumentId?: string;
}

const ResultsList: React.FC<ResultsListProps> = ({
  results,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onResultClick,
  searchQuery = "",
  className,
  error,
  onRetry,
  showStats = false,
  showSimilar = false,
  selectedDocumentId,
}) => {
  const [visibleResults, setVisibleResults] = useState<SearchResult[]>([]);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [showSimilarPanel, setShowSimilarPanel] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch search stats
  const {
    data: searchStatsData,
    isLoading: isStatsLoading,
    error: statsError,
  } = useSearchStats({
    enabled: showStats && showStatsPanel,
  });

  // Fetch similar documents
  const {
    data: similarDocumentsData,
    isLoading: isSimilarLoading,
    error: similarError,
  } = useSimilarDocuments(
    selectedDocumentId || "",
    {
      limit: 5,
      threshold: 0.7,
    },
    {
      enabled: showSimilar && showSimilarPanel && !!selectedDocumentId,
    },
  );

  // Update visible results when results change
  useEffect(() => {
    setVisibleResults(results);
  }, [results]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading && onLoadMore) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  // Highlight search terms in text
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const terms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 0);
    let highlightedText = text;

    terms.forEach((term) => {
      const regex = new RegExp(`(${term})`, "gi");
      highlightedText = highlightedText.replace(
        regex,
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>',
      );
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Handle result card click
  const handleResultClick = (result: SearchResult, event: React.MouseEvent) => {
    // Don't trigger if clicking on external link
    if ((event.target as HTMLElement).closest(".external-link")) {
      return;
    }
    onResultClick?.(result);
  };

  // Handle external link click
  const handleExternalLinkClick = (url: string, event: React.MouseEvent) => {
    event.stopPropagation();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Show loading skeleton for initial load
  if (isLoading && visibleResults.length === 0) {
    return <ResultsListSkeleton />;
  }

  // Show error state
  if (error && visibleResults.length === 0) {
    return <ErrorDisplay error={error} onRetry={onRetry} className="mt-8" />;
  }

  // Show empty state when no results and not loading
  if (!isLoading && visibleResults.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description={
          searchQuery
            ? `No documents match "${searchQuery}"`
            : "Try searching for documents or asking a question"
        }
        icon={<FileText className="h-12 w-12 text-gray-400" />}
        action={
          onRetry
            ? {
                label: "Try again",
                onClick: onRetry,
              }
            : undefined
        }
        className={cn("mt-8", className)}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)} ref={observerRef}>
      {/* Header with Stats and Similar Documents */}
      {visibleResults.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600">
            {visibleResults.length} result
            {visibleResults.length !== 1 ? "s" : ""}
            {searchQuery && ` for "${searchQuery}"`}
          </div>

          <div className="flex items-center space-x-2">
            {showStats && (
              <button
                onClick={() => setShowStatsPanel(!showStatsPanel)}
                className={cn(
                  "flex items-center px-3 py-1 text-sm rounded-md transition-colors",
                  showStatsPanel
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Stats
              </button>
            )}
            {showSimilar && selectedDocumentId && (
              <button
                onClick={() => setShowSimilarPanel(!showSimilarPanel)}
                className={cn(
                  "flex items-center px-3 py-1 text-sm rounded-md transition-colors",
                  showSimilarPanel
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                <Shuffle className="h-4 w-4 mr-1" />
                Similar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Panel */}
      {showStatsPanel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Search Statistics
          </h3>
          {isStatsLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-blue-200 rounded w-3/4"></div>
              <div className="h-4 bg-blue-200 rounded w-1/2"></div>
              <div className="h-4 bg-blue-200 rounded w-2/3"></div>
            </div>
          ) : statsError ? (
            <div className="text-red-600 text-sm">
              Failed to load statistics
            </div>
          ) : searchStatsData ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-blue-700 font-medium">
                  {searchStatsData.totalDocuments}
                </div>
                <div className="text-blue-600">Total Documents</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">
                  {searchStatsData.indexedDocuments}
                </div>
                <div className="text-blue-600">Indexed</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">
                  {searchStatsData.totalSearches}
                </div>
                <div className="text-blue-600">Total Searches</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">
                  {Math.round(searchStatsData.averageResponseTime)}ms
                </div>
                <div className="text-blue-600">Avg Response</div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Similar Documents Panel */}
      {showSimilarPanel && selectedDocumentId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-green-900 mb-3 flex items-center">
            <Shuffle className="h-4 w-4 mr-2" />
            Similar Documents
          </h3>
          {isSimilarLoading ? (
            <div className="animate-pulse space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-4 w-4 bg-green-200 rounded"></div>
                  <div className="h-4 bg-green-200 rounded flex-1"></div>
                  <div className="h-4 bg-green-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : similarError ? (
            <div className="text-red-600 text-sm">
              Failed to load similar documents
            </div>
          ) : similarDocumentsData && similarDocumentsData.length > 0 ? (
            <div className="space-y-2">
              {similarDocumentsData.map((doc, index) => (
                <div
                  key={doc.id}
                  onClick={() => onResultClick?.(doc)}
                  className="flex items-center justify-between p-2 bg-white rounded border border-green-200 hover:border-green-300 cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800 truncate">
                      {doc.title || doc.documentName}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 ml-2">
                    {Math.round((doc.score || 0) * 100)}% similar
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-green-600 text-sm">
              No similar documents found
            </div>
          )}
        </div>
      )}

      {/* Results Grid */}
      <div className="grid gap-4">
        {visibleResults.map((result, index) => (
          <div
            key={`${result.id}-${index}`}
            onClick={(e) => handleResultClick(result, e)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                  {highlightText(
                    result.title || result.documentName,
                    searchQuery,
                  )}
                </h3>
                <div className="flex items-center mt-1 text-sm text-gray-500 space-x-4">
                  {result.folderName && (
                    <div className="flex items-center">
                      <Folder className="h-4 w-4 mr-1" />
                      <span className="truncate">{result.folderName}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{formatDate(result.dateIndexed)}</span>
                  </div>
                  {result.score && (
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {Math.round(result.score * 100)}% match
                    </div>
                  )}
                </div>
              </div>

              {/* External Link Button */}
              <button
                onClick={(e) => handleExternalLinkClick(result.driveUrl, e)}
                className="external-link flex-shrink-0 ml-4 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Open in Google Drive"
              >
                <ExternalLink className="h-5 w-5" />
              </button>
            </div>

            {/* Snippet */}
            <div className="text-gray-700 leading-relaxed">
              <p className="line-clamp-3">
                {highlightText(result.snippet, searchQuery)}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center text-sm text-gray-500">
                <FileText className="h-4 w-4 mr-1" />
                <span className="truncate">{result.documentName}</span>
              </div>

              <div className="text-xs text-gray-400">Click to preview</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="flex space-x-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-9 w-9 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      {hasMore && !isLoading && (
        <div
          ref={loadMoreRef}
          className="h-10 flex items-center justify-center"
        >
          <div className="text-sm text-gray-500">Loading more results...</div>
        </div>
      )}

      {/* Error state for load more */}
      {error && visibleResults.length > 0 && (
        <div className="mt-4">
          <ErrorDisplay error={error} onRetry={onRetry} />
        </div>
      )}

      {/* End of Results */}
      {!hasMore && visibleResults.length > 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          No more results to load
        </div>
      )}
    </div>
  );
};

export default ResultsList;
