import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ChevronDown, ChevronUp, FileText, User, Calendar, Download,  } from 'lucide-react';
import { useDocument, useSnippets } from '../hooks/useApi';
import type { SearchResult } from '../types/api';
import { cn } from '../lib/utils';
import { SnippetPreviewSkeleton } from './LoadingSkeletons';
import { ErrorDisplay, EmptyState } from './ErrorBoundary';

interface SnippetPreviewProps {
  result: SearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  searchQuery?: string;
  className?: string;
}

const SnippetPreview: React.FC<SnippetPreviewProps> = ({
  result,
  isOpen,
  onClose,
  searchQuery = '',
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);

  // Fetch document details
  const {
    data: documentData,
    isLoading: isDocumentLoading,
    error: documentError,
  } = useDocument(result?.id || '', {
    enabled: !!result?.id && isOpen,
  });

  // Fetch snippets
  const {
    data: snippetsData,
    isLoading: isSnippetsLoading,
    error: snippetsError,
    refetch: refetchSnippets,
  } = useSnippets(
    {
      documentId: result?.id || '',
      query: searchQuery,
      maxSnippets: 5,
    },
    {
      enabled: !!result?.id && isOpen,
    }
  );

  // Reset state when result changes
  useEffect(() => {
    if (result) {
      setIsExpanded(false);
      setActiveSnippetIndex(0);
    }
  }, [result]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Highlight search terms
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle external link click
  const handleExternalLinkClick = () => {
    if (result?.driveUrl) {
      window.open(result.driveUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen || !result) {
    return null;
  }

  const isLoading = isDocumentLoading || isSnippetsLoading;
  // const hasError = documentError || snippetsError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col',
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">
              {result.title || result.documentName}
            </h2>
            <div className="flex items-center mt-1 text-sm text-gray-500 space-x-4">
              {result.folderName && (
                <span className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  {result.folderName}
                </span>
              )}
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(result.dateIndexed)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleExternalLinkClick}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Open in Google Drive"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <SnippetPreviewSkeleton />
          ) : documentError ? (
            <div className="flex-1 flex items-center justify-center">
              <ErrorDisplay 
                error={documentError} 
                title="Failed to load document"
                onRetry={() => window.location.reload()}
              />
            </div>
          ) : snippetsError ? (
            <div className="flex-1 flex items-center justify-center">
              <ErrorDisplay 
                error={snippetsError} 
                title="Failed to load snippets"
                onRetry={() => refetchSnippets()}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Document Metadata */}
              {documentData && (
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {documentData.metadata.owner && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-600">Owner:</span>
                        <span className="ml-1 font-medium">{documentData.metadata.owner}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-1 font-medium">{documentData.metadata.fileType}</span>
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Size:</span>
                      <span className="ml-1 font-medium">{formatFileSize(documentData.metadata.size)}</span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-1 font-medium">{formatDate(documentData.metadata.dateCreated)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Modified:</span>
                      <span className="ml-1 font-medium">{formatDate(documentData.metadata.dateModified)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Snippets */}
              {snippetsData && snippetsData.snippets.length > 0 ? (
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Relevant Excerpts {searchQuery && `for "${searchQuery}"`}
                  </h3>
                  
                  {/* Snippet Navigation */}
                  {snippetsData.snippets.length > 1 && (
                    <div className="flex space-x-2 mb-4">
                      {snippetsData.snippets.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveSnippetIndex(index)}
                          className={cn(
                            'px-3 py-1 text-sm rounded-md transition-colors',
                            activeSnippetIndex === index
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          Excerpt {index + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Snippet */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="prose max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {highlightText(snippetsData.snippets[activeSnippetIndex].text, searchQuery)}
                      </p>
                    </div>
                    
                    {snippetsData.snippets[activeSnippetIndex].relevanceScore && (
                      <div className="mt-3 text-xs text-gray-500">
                        Relevance: {Math.round(snippetsData.snippets[activeSnippetIndex].relevanceScore! * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              ) : searchQuery ? (
                <div className="p-6">
                  <EmptyState 
                    title="No excerpts found"
                    description={`No relevant excerpts found for "${searchQuery}" in this document.`}
                  />
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState 
                    title="No excerpts available"
                    description="No excerpts available for this document."
                  />
                </div>
              )}

              {/* Full Content Toggle */}
              {documentData && (
                <div className="border-t border-gray-200">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center p-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Hide full content
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Show full content
                      </>
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-6 border-t border-gray-200 bg-gray-50">
                      <div className="prose max-w-none">
                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {highlightText(documentData.content, searchQuery)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to close
          </div>
          <button
            onClick={handleExternalLinkClick}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={!result?.driveUrl}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Drive
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnippetPreview;