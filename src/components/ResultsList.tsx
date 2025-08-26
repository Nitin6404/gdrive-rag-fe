import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, FileText, Calendar, Folder } from 'lucide-react';
import type { SearchResult } from '../types/api';
import { cn } from '../lib/utils';
import { ResultsListSkeleton } from './LoadingSkeletons';
import { ErrorDisplay, EmptyState } from './ErrorBoundary';

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
}

const ResultsList: React.FC<ResultsListProps> = ({
  results,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onResultClick,
  searchQuery = '',
  className,
  error,
  onRetry,
}) => {
  const [visibleResults, setVisibleResults] = useState<SearchResult[]>([]);
  const observerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
        rootMargin: '100px',
      }
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

    const terms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Handle result card click
  const handleResultClick = (result: SearchResult, event: React.MouseEvent) => {
    // Don't trigger if clicking on external link
    if ((event.target as HTMLElement).closest('.external-link')) {
      return;
    }
    onResultClick?.(result);
  };

  // Handle external link click
  const handleExternalLinkClick = (url: string, event: React.MouseEvent) => {
    event.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Show loading skeleton for initial load
  if (isLoading && visibleResults.length === 0) {
    return <ResultsListSkeleton />;
  }

  // Show error state
  if (error && visibleResults.length === 0) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={onRetry}
        className="mt-8"
      />
    );
  }

  // Show empty state when no results and not loading
  if (!isLoading && visibleResults.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description={searchQuery ? `No documents match "${searchQuery}"` : 'Try searching for documents or asking a question'}
        icon={<FileText className="h-12 w-12 text-gray-400" />}
        action={onRetry ? {
          label: "Try again",
          onClick: onRetry
        } : undefined}
        className={cn('mt-8', className)}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)} ref={observerRef}>
      {/* Results Count */}
      {visibleResults.length > 0 && (
        <div className="text-sm text-gray-600 mb-4">
          {visibleResults.length} result{visibleResults.length !== 1 ? 's' : ''}
          {searchQuery && ` for "${searchQuery}"`}
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
                  {highlightText(result.title || result.documentName, searchQuery)}
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
              
              <div className="text-xs text-gray-400">
                Click to preview
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
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
        <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
          <div className="text-sm text-gray-500">Loading more results...</div>
        </div>
      )}

      {/* Error state for load more */}
      {error && visibleResults.length > 0 && (
        <div className="mt-4">
          <ErrorDisplay 
            error={error} 
            onRetry={onRetry}
          />
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