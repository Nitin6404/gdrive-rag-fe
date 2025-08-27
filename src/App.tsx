import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import SnippetPreview from "./components/SnippetPreview";
import ChatPanel from "./components/ChatPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSearch, useSemanticSearch } from "./hooks/useApi";
import { type SearchResult } from "./types/api";
import { Search, MessageSquare, FileText } from "lucide-react";

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

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContext, setSelectedContext] = useState<
    { type: "folder" | "document"; id: string } | undefined
  >();
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"search" | "semantic" | "rag">(
    "search",
  );

  const {
    data: searchData,
    isLoading: isSearchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useSearch(
    searchQuery,
    {
      folderId:
        selectedContext?.type === "folder" ? selectedContext.id : undefined,
      limit: 20,
    },
    {
      enabled: !!searchQuery && searchMode === "search",
    },
  );

  const {
    data: semanticSearchData,
    isLoading: isSemanticSearchLoading,
    error: semanticSearchError,
    refetch: refetchSemanticSearch,
  } = useSemanticSearch(
    {
      query: searchQuery,
      limit: 20,
      threshold: 0.7,
      documentIds:
        selectedContext?.type === "document" ? [selectedContext.id] : undefined,
      fileTypes: undefined,
    },
    {
      enabled: !!searchQuery && searchMode === "semantic",
    },
  );

  const handleSearch = (
    query: string,
    context?: { type: "folder" | "document"; id: string },
  ) => {
    setSearchQuery(query);
    setSelectedContext(context);
    setSearchMode("search");
  };

  const handleSemanticSearch = (
    query: string,
    context?: { type: "folder" | "document"; id: string },
  ) => {
    setSearchQuery(query);
    setSelectedContext(context);
    setSearchMode("semantic");
  };

  const handleRAGQuery = (
    query: string,
    context?: { type: "folder" | "document"; id: string },
  ) => {
    setSearchQuery(query);
    setSelectedContext(context);
    setSearchMode("rag");
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedResult(result);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setSelectedResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                <span className="hidden sm:inline">Document Search</span>
                <span className="sm:hidden">DocSearch</span>
              </h1>
            </div>
            <nav className="flex space-x-1 sm:space-x-4">
              <a
                href="#search"
                className="text-blue-600 hover:text-blue-700 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <Search className="h-4 w-4 sm:inline sm:mr-1" />
                <span className="hidden sm:inline">Search</span>
              </a>
              <a
                href="#chat"
                className="text-gray-600 hover:text-gray-700 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4 sm:inline sm:mr-1" />
                <span className="hidden sm:inline">Chat</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Search Section */}
          <div className="xl:col-span-2">
            {/* Search Bar */}
            <div className="mb-6 sm:mb-8">
              <SearchBar
                onSearch={handleSearch}
                onSemanticSearch={handleSemanticSearch}
                onRAGQuery={handleRAGQuery}
                placeholder="Search documents or ask AI a question..."
              />
            </div>

            {/* Results or Chat */}
            {searchMode === "search" ? (
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
            ) : searchMode === "semantic" ? (
              <ResultsList
                results={semanticSearchData?.results || []}
                isLoading={isSemanticSearchLoading}
                hasMore={semanticSearchData?.hasMore || false}
                onResultClick={handleResultClick}
                searchQuery={searchQuery}
                showStats={true}
                showSimilar={true}
                selectedDocumentId={selectedResult?.id}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[500px] sm:h-[600px]">
                <ChatPanel
                  initialQuery={searchQuery}
                  contextId={selectedContext?.id}
                  contextType={selectedContext?.type}
                />
              </div>
            )}

            {/* Error State */}
            {(searchError || semanticSearchError) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="text-red-600 text-sm flex-1">
                    <strong>Error:</strong>{" "}
                    {(searchError || semanticSearchError)?.message}
                  </div>
                  <button
                    onClick={() =>
                      searchMode === "search"
                        ? refetchSearch()
                        : refetchSemanticSearch()
                    }
                    className="text-red-600 hover:text-red-700 text-sm underline self-start sm:self-auto"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 order-first xl:order-last">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 sticky top-4">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    Recent Documents
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    View recently accessed files
                  </div>
                </button>
                <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    Upload Document
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Add new files to search
                  </div>
                </button>
                <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="font-medium text-gray-900 text-sm sm:text-base">
                    Browse Folders
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">
                    Explore document structure
                  </div>
                </button>
              </div>
            </div>

            {/* Search Tips */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 sm:p-6 mt-4 sm:mt-6">
              <h4 className="font-medium text-blue-900 mb-3 text-sm sm:text-base">
                Search Tips
              </h4>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-2">
                <li>
                  • <strong>Keyword:</strong> Use quotes for exact phrases
                </li>
                <li>
                  • <strong>Semantic:</strong> Search by meaning and context
                </li>
                <li>
                  • <strong>AI Chat:</strong> Ask questions in natural language
                </li>
                <li>• Select a folder to narrow your search</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

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

function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">AI Chat</h1>
            </div>
            <nav className="flex space-x-4">
              <a
                href="#search"
                className="text-gray-600 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                <Search className="h-4 w-4 inline mr-1" />
                Search
              </a>
              <a
                href="#chat"
                className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Chat
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)]">
          <ChatPanel />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
