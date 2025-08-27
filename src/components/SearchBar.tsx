import React, { useState, useEffect, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";

interface SearchBarProps {
  onSearch: (query: string, folderId?: string, documentId?: string) => void;
  placeholder?: string;
  className?: string;
  selectedFolderId?: string;
  selectedDocumentId?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search documents...",
  className,
  selectedFolderId,
  selectedDocumentId,
}) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Fetch search suggestions
  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: () => apiService.getSearchSuggestions(debouncedQuery, 5),
    enabled: !!debouncedQuery && debouncedQuery.length > 1,
    staleTime: 30000, // 30 seconds
    select: (data) => data.data,
  });

  // Debounce the query input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isComposing) {
        setDebouncedQuery(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isComposing]);

  const suggestions = suggestionsData?.suggestions || [];

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
      onSearch(query.trim(), selectedFolderId, selectedDocumentId);
      setShowAutocomplete(false);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className || ""}`}>
      {/* Main Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center bg-white border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          {/* Search Icon */}
          <div className="pl-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
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
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Autocomplete Dropdown */}
        {showAutocomplete && debouncedQuery && (
          <div className="relative">
            {isLoadingSuggestions ? (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50">
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
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
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center"
                    >
                      <MagnifyingGlassIcon className="h-4 w-4 mr-2 text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : debouncedQuery.length > 1 ? (
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
