import React, { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Calendar,
  Download,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  useDocument,
  useSnippets,
  useDocumentSnippets,
  useSpecificSnippet,
  useSnippetSearch,
} from "../hooks/useApi";
import type { SearchResult } from "../types/api";
import { cn } from "../lib/utils";
import { SnippetPreviewSkeleton } from "./LoadingSkeletons";
import { ErrorDisplay, EmptyState } from "./ErrorBoundary";

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
  searchQuery = "",
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState(0);
  const [snippetSearchQuery, setSnippetSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"relevant" | "all" | "search">(
    "relevant",
  );
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(
    null,
  );

  // Fetch document details
  const {
    data: documentData,
    isLoading: isDocumentLoading,
    error: documentError,
  } = useDocument(result?.id || "", {
    enabled: !!result?.id && isOpen,
  });

  // Fetch snippets (legacy)
  const {
    data: snippetsData,
    isLoading: isSnippetsLoading,
    error: snippetsError,
    refetch: refetchSnippets,
  } = useSnippets(
    {
      documentId: result?.id || "",
      query: searchQuery,
      maxSnippets: 5,
    },
    {
      enabled: !!result?.id && isOpen && viewMode === "relevant",
    },
  );

  // Fetch all document snippets
  const {
    data: allSnippetsData,
    isLoading: isAllSnippetsLoading,
    error: allSnippetsError,
    refetch: refetchAllSnippets,
  } = useDocumentSnippets(
    result?.id || "",
    {
      limit: 50,
      includeText: true,
    },
    {
      enabled: !!result?.id && isOpen && viewMode === "all",
    },
  );

  // Fetch specific snippet
  const {
    data: specificSnippetData,
    isLoading: isSpecificSnippetLoading,
    error: specificSnippetError,
  } = useSpecificSnippet(result?.id || "", selectedChunkIndex || 0, {
    enabled: !!result?.id && isOpen && selectedChunkIndex !== null,
  });

  // Search snippets
  const {
    data: searchSnippetsData,
    isLoading: isSearchSnippetsLoading,
    error: searchSnippetsError,
    refetch: refetchSearchSnippets,
  } = useSnippetSearch(
    {
      query: snippetSearchQuery,
      limit: 20,
      documentIds: result?.id ? [result.id] : [],
    },
    {
      enabled:
        !!result?.id &&
        isOpen &&
        viewMode === "search" &&
        snippetSearchQuery.length > 2,
    },
  );

  // Reset state when result changes
  useEffect(() => {
    if (result) {
      setIsExpanded(false);
      setActiveSnippetIndex(0);
      setSnippetSearchQuery("");
      setViewMode("relevant");
      setSelectedChunkIndex(null);
    }
  }, [result]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Highlight search terms
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
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Handle external link click
  const handleExternalLinkClick = () => {
    if (result?.driveUrl) {
      window.open(result.driveUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen || !result) {
    return null;
  }

  const isLoading =
    isDocumentLoading ||
    isSnippetsLoading ||
    isAllSnippetsLoading ||
    isSpecificSnippetLoading ||
    isSearchSnippetsLoading;
  const hasSnippetsError =
    snippetsError ||
    allSnippetsError ||
    specificSnippetError ||
    searchSnippetsError;

  // Get current snippets based on view mode
  const getCurrentSnippets = () => {
    switch (viewMode) {
      case "relevant":
        return snippetsData?.snippets || [];
      case "all":
        return allSnippetsData?.snippets || [];
      case "search":
        return searchSnippetsData?.snippets || [];
      default:
        return [];
    }
  };

  const currentSnippets = getCurrentSnippets();

  // Handle snippet search
  const handleSnippetSearch = (query: string) => {
    setSnippetSearchQuery(query);
    if (query.length > 2) {
      setViewMode("search");
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode: "relevant" | "all" | "search") => {
    setViewMode(mode);
    setActiveSnippetIndex(0);
    setSelectedChunkIndex(null);
  };

  // Handle chunk selection for specific snippet
  const handleChunkSelection = (chunkIndex: number) => {
    setSelectedChunkIndex(chunkIndex);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className={cn(
          "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col",
          className,
        )}
      >
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
          ) : hasSnippetsError ? (
            <div className="flex-1 flex items-center justify-center">
              <ErrorDisplay
                error={hasSnippetsError}
                title="Failed to load snippets"
                onRetry={() => {
                  if (viewMode === "relevant") refetchSnippets();
                  else if (viewMode === "all") refetchAllSnippets();
                  else if (viewMode === "search") refetchSearchSnippets();
                }}
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
                        <span className="ml-1 font-medium">
                          {documentData.metadata.owner}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-1 font-medium">
                        {documentData.metadata.fileType}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Size:</span>
                      <span className="ml-1 font-medium">
                        {formatFileSize(documentData.metadata.size)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Created:</span>
                      <span className="ml-1 font-medium">
                        {formatDate(documentData.metadata.dateCreated)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Modified:</span>
                      <span className="ml-1 font-medium">
                        {formatDate(documentData.metadata.dateModified)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Snippet Controls */}
              <div className="p-6 border-b border-gray-200">
                {/* View Mode Tabs */}
                <div className="flex space-x-1 mb-4">
                  <button
                    onClick={() => handleViewModeChange("relevant")}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      viewMode === "relevant"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    Relevant
                  </button>
                  <button
                    onClick={() => handleViewModeChange("all")}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      viewMode === "all"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    All Snippets
                  </button>
                  <button
                    onClick={() => handleViewModeChange("search")}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      viewMode === "search"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                    )}
                  >
                    Search
                  </button>
                </div>

                {/* Snippet Search */}
                {viewMode === "search" && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={snippetSearchQuery}
                      onChange={(e) => handleSnippetSearch(e.target.value)}
                      placeholder="Search within this document..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Snippets */}
              {currentSnippets.length > 0 ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {viewMode === "relevant" &&
                        `Relevant Excerpts ${searchQuery ? `for "${searchQuery}"` : ""}`}
                      {viewMode === "all" && "All Document Snippets"}
                      {viewMode === "search" &&
                        `Search Results ${snippetSearchQuery ? `for "${snippetSearchQuery}"` : ""}`}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {currentSnippets.length} snippet
                      {currentSnippets.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Snippet Navigation */}
                  {currentSnippets.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {currentSnippets.map((snippet, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setActiveSnippetIndex(index);
                            if (
                              viewMode === "all" &&
                              snippet.chunkIndex !== undefined
                            ) {
                              handleChunkSelection(snippet.chunkIndex);
                            }
                          }}
                          className={cn(
                            "px-3 py-1 text-sm rounded-md transition-colors",
                            activeSnippetIndex === index
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          )}
                        >
                          {viewMode === "all" &&
                          snippet.chunkIndex !== undefined
                            ? `Chunk ${snippet.chunkIndex + 1}`
                            : `Excerpt ${index + 1}`}
                          {snippet.relevanceScore && (
                            <span className="ml-1 text-xs opacity-75">
                              ({Math.round(snippet.relevanceScore * 100)}%)
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Snippet */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="prose max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {highlightText(
                          currentSnippets[activeSnippetIndex].text,
                          viewMode === "search"
                            ? snippetSearchQuery
                            : searchQuery,
                        )}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        {currentSnippets[activeSnippetIndex].relevanceScore && (
                          <span>
                            Relevance:{" "}
                            {Math.round(
                              currentSnippets[activeSnippetIndex]
                                .relevanceScore! * 100,
                            )}
                            %
                          </span>
                        )}
                        {currentSnippets[activeSnippetIndex].chunkIndex !==
                          undefined && (
                          <span>
                            Chunk:{" "}
                            {currentSnippets[activeSnippetIndex].chunkIndex! +
                              1}
                          </span>
                        )}
                        {viewMode === "all" &&
                          currentSnippets[activeSnippetIndex].chunkIndex !==
                            undefined && (
                            <button
                              onClick={() =>
                                handleChunkSelection(
                                  currentSnippets[activeSnippetIndex]
                                    .chunkIndex!,
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              View with context
                            </button>
                          )}
                      </div>
                      {viewMode === "search" && (
                        <button
                          onClick={() => refetchSearchSnippets()}
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Refresh
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Specific Snippet Context */}
                  {selectedChunkIndex !== null && specificSnippetData && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">
                        Chunk {selectedChunkIndex + 1} with Context
                      </h4>
                      <div className="prose max-w-none">
                        <p className="text-blue-800 leading-relaxed text-sm">
                          {highlightText(
                            specificSnippetData.text,
                            viewMode === "search"
                              ? snippetSearchQuery
                              : searchQuery,
                          )}
                        </p>
                      </div>
                      {specificSnippetData.context && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-blue-700 mb-1">
                            Surrounding Context:
                          </h5>
                          <div className="text-xs text-blue-600 space-y-1">
                            {specificSnippetData.context.before && (
                              <p>...{specificSnippetData.context.before}</p>
                            )}
                            {specificSnippetData.context.after && (
                              <p>{specificSnippetData.context.after}...</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <EmptyState
                    title={
                      viewMode === "search"
                        ? "No search results"
                        : "No excerpts found"
                    }
                    description={
                      viewMode === "search" && snippetSearchQuery
                        ? `No snippets found for "${snippetSearchQuery}" in this document.`
                        : viewMode === "relevant" && searchQuery
                          ? `No relevant excerpts found for "${searchQuery}" in this document.`
                          : "No excerpts available for this document."
                    }
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
            Press{" "}
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Esc</kbd> to
            close
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
