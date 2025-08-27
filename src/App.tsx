import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import SnippetPreview from "./components/SnippetPreview";
import ChatPanel from "./components/ChatPanel";
import Sidebar from "./components/Sidebar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSearch } from "./hooks/useApi";
import { type SearchResult } from "./types/api";
import { FileText, MessageSquare } from "lucide-react";

// Create a query client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

function MainApp() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<
    string | undefined
  >();
  const [selectedDocumentId, setSelectedDocumentId] = useState<
    string | undefined
  >();
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSearch(
    searchQuery,
    {
      folderId: selectedFolderId,
      documentId: selectedDocumentId,
      limit: 20,
    },
    {
      enabled: !!searchQuery && showSearchResults,
    }
  );
  console.log("searchData", searchData);

  const handleSearch = (
    query: string,
    folderId?: string,
    documentId?: string
  ) => {
    setSearchQuery(query);
    setShowSearchResults(true);
    if (folderId) setSelectedFolderId(folderId);
    if (documentId) setSelectedDocumentId(documentId);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedDocumentId(undefined);
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setSelectedFolderId(undefined);
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedResult(null);
  };

  const handleBackToChat = () => {
    setShowSearchResults(false);
    setSearchQuery("");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Document Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Documents
                </h1>
                <p className="text-sm text-gray-500">Browse and select files</p>
              </div>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden">
            <Sidebar
              onFolderSelect={handleFolderSelect}
              onDocumentSelect={handleDocumentSelect}
              selectedFolderId={selectedFolderId}
              selectedDocumentId={selectedDocumentId}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Search Bar */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search documents or ask AI a question..."
          />
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden">
          {showSearchResults ? (
            <div className="h-full flex flex-col">
              {/* Search Results Header */}
              <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Search Results
                  </h2>
                  <button
                    onClick={handleBackToChat}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Back to Chat</span>
                  </button>
                </div>
              </div>

              {/* Search Results */}
              <div className="flex-1 overflow-auto px-6 py-4">
                <ResultsList
                  results={searchData?.results || []}
                  isLoading={isSearchLoading}
                  hasMore={searchData?.hasMore || false}
                  onResultClick={handleResultClick}
                  searchQuery={searchQuery}
                  showStats={true}
                  showSimilar={true}
                  selectedDocumentId={selectedResult?.id}
                />

                {/* Error State */}
                {searchError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <div className="text-red-600 text-sm">
                      <strong>Error:</strong> {searchError.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Chat Interface */
            <div className="h-full">
              <ChatPanel
                selectedFolderId={selectedFolderId}
                selectedDocumentId={selectedDocumentId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Snippet Preview Modal */}
      <SnippetPreview
        result={selectedResult}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        searchQuery={searchQuery}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MainApp />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
