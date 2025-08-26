import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageSquare, ChevronDown, X, Loader2 } from 'lucide-react';
import { useAutocomplete } from '../hooks/useApi';
import { cn } from '../lib/utils';
import { AutocompleteSkeleton } from './LoadingSkeletons';
import { ErrorDisplay } from './ErrorBoundary';

interface SearchBarProps {
  onSearch: (query: string, context?: { type: 'folder' | 'document'; id: string }) => void;
  onRAGQuery: (query: string, context?: { type: 'folder' | 'document'; id: string }) => void;
  placeholder?: string;
  className?: string;
}

interface ContextOption {
  id: string;
  name: string;
  type: 'folder' | 'document';
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onRAGQuery,
  placeholder = "Search documents or ask a question...",
  className,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<ContextOption | null>(null);
  const [showContextDropdown, setShowContextDropdown] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchMode, setSearchMode] = useState<'search' | 'rag'>('search');
  const [isComposing, setIsComposing] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Mock context options - in real app, these would come from API
  const contextOptions: ContextOption[] = [
    { id: 'all', name: 'All Documents', type: 'folder' },
    { id: 'reports', name: 'Reports Folder', type: 'folder' },
    { id: 'presentations', name: 'Presentations', type: 'folder' },
    { id: 'contracts', name: 'Contracts', type: 'folder' },
  ];

  // Debounce the query input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isComposing) {
        setDebouncedQuery(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isComposing]);

  // Fetch autocomplete suggestions
  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
    error: suggestionsError,
  } = useAutocomplete(debouncedQuery, {
    enabled: !!debouncedQuery && debouncedQuery.length > 2,
  });

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowAutocomplete(value.length > 1);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const context = selectedContext && selectedContext.id !== 'all' 
        ? { type: selectedContext.type, id: selectedContext.id }
        : undefined;
      
      if (searchMode === 'rag') {
        onRAGQuery(query.trim(), context);
      } else {
        onSearch(query.trim(), context);
      }
      
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Handle context selection
  const handleContextSelect = (context: ContextOption) => {
    setSelectedContext(context);
    setShowContextDropdown(false);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setDebouncedQuery('');
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContextDropdown(false);
      }
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative w-full max-w-4xl mx-auto', className)}>
      {/* Search Mode Toggle */}
      <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setSearchMode('search')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            searchMode === 'search'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Search Documents
        </button>
        <button
          type="button"
          onClick={() => setSearchMode('rag')}
          className={cn(
            'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
            searchMode === 'rag'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          )}
        >
          Ask AI
        </button>
      </div>

      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          {/* Context Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowContextDropdown(!showContextDropdown)}
              className="flex items-center px-4 py-3 text-sm text-gray-600 hover:text-gray-900 border-r border-gray-300"
            >
              <span className="truncate max-w-32">
                {selectedContext?.name || 'All Documents'}
              </span>
              <ChevronDown className="ml-2 h-4 w-4" />
            </button>

            {/* Context Dropdown */}
            {showContextDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                {contextOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleContextSelect(option)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder={placeholder}
              className="w-full px-4 py-3 text-gray-900 placeholder-gray-500 bg-transparent border-0 focus:outline-none"
              autoComplete="off"
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim() || isLoadingSuggestions}
            className={cn(
              'px-6 py-3 rounded-r-lg transition-colors inline-flex items-center justify-center',
              searchMode === 'search'
                ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300'
                : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300'
            )}
          >
            {isLoadingSuggestions ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : searchMode === 'search' ? (
              <Search className="h-5 w-5" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showAutocomplete && debouncedQuery && (
          <div className="relative">
            {isLoadingSuggestions ? (
              <AutocompleteSkeleton />
            ) : suggestionsError ? (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50">
                <div className="p-2">
                  <ErrorDisplay 
                    error={suggestionsError} 
                    className="border-0 bg-transparent p-2" 
                  />
                </div>
              </div>
            ) : suggestions && suggestions.length > 0 ? (
              <div
                ref={autocompleteRef}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-40 max-h-60 overflow-y-auto"
              >
                <div className="py-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleAutocompleteSelect(suggestion)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 first:rounded-t-md last:rounded-b-md"
                    >
                      <Search className="inline h-4 w-4 mr-2 text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : debouncedQuery.length > 2 ? (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50">
                <div className="p-4 text-center text-gray-500">
                  No suggestions found
                </div>
              </div>
            ) : null}
          </div>
        )}
      </form>
    </div>
  );
};

export default SearchBar;