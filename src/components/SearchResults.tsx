import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, DocumentIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface SearchResultSnippet {
  id: string;
  chunkIndex: number;
  text: string;
  preview: string;
  metadata: {
    createdAt?: string;
    [key: string]: any;
  };
}

interface SearchResultDocument {
  fileName: string;
  fileType: string;
  size: number;
  totalChunks: number;
}

interface SearchResultItem {
  documentId: string;
  document: SearchResultDocument;
  snippets: SearchResultSnippet[];
}

interface SearchResultsProps {
  results: SearchResultItem[];
  searchQuery?: string;
}

const getFileTypeIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return '📄';
  if (type.includes('doc')) return '📝';
  if (type.includes('csv')) return '📊';
  if (type.includes('txt')) return '📄';
  if (type.includes('json')) return '🔧';
  return '📄';
};

const getFileTypeBadgeColor = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) return 'bg-red-100 text-red-800';
  if (type.includes('doc')) return 'bg-blue-100 text-blue-800';
  if (type.includes('csv')) return 'bg-green-100 text-green-800';
  if (type.includes('txt')) return 'bg-gray-100 text-gray-800';
  if (type.includes('json')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const highlightText = (text: string, query?: string) => {
  if (!query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

const DocumentCard: React.FC<{
  item: SearchResultItem;
  searchQuery?: string;
}> = ({ item, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<SearchResultSnippet | null>(null);
  
  const topSnippet = item.snippets[0];
  const matchCount = item.snippets.length;
  
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className="text-2xl">{getFileTypeIcon(item.document.fileType)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {item.document.fileName}
                </h3>
                <Badge className={getFileTypeBadgeColor(item.document.fileType)}>
                  {item.document.fileType.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <span>{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
                <span>{formatFileSize(item.document.size)}</span>
                <span>{item.document.totalChunks} chunks</span>
              </div>
              
              {topSnippet && (
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Top match: </span>
                  {highlightText(
                    topSnippet.preview.length > 200 
                      ? topSnippet.preview.substring(0, 200) + '...' 
                      : topSnippet.preview,
                    searchQuery
                  )}
                </div>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
            <span className="ml-1">View all</span>
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">All matching chunks:</h4>
            <div className="space-y-3">
              {item.snippets.map((snippet, index) => (
                <div key={snippet.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        Chunk {snippet.chunkIndex}
                      </Badge>
                      {snippet.metadata.createdAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(snippet.metadata.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View full
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {item.document.fileName} - Chunk {snippet.chunkIndex}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="whitespace-pre-wrap text-sm">
                              {highlightText(snippet.text, searchQuery)}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="text-sm text-gray-700">
                    {highlightText(
                      snippet.preview.length > 300 
                        ? snippet.preview.substring(0, 300) + '...' 
                        : snippet.preview,
                      searchQuery
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

const SearchResults: React.FC<SearchResultsProps> = ({ results, searchQuery }) => {
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12">
        <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-600">Try adjusting your search terms or check your spelling.</p>
      </div>
    );
  }
  
  // Sort documents by number of matches (relevance)
  const sortedResults = [...results].sort((a, b) => b.snippets.length - a.snippets.length);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Search Results ({results.length} document{results.length !== 1 ? 's' : ''})
        </h2>
        {searchQuery && (
          <div className="text-sm text-gray-600">
            Searching for: <span className="font-medium">"{searchQuery}"</span>
          </div>
        )}
      </div>
      
      {sortedResults.map((item) => (
        <DocumentCard
          key={item.documentId}
          item={item}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
};

export default SearchResults;
export { SearchResults };
export type { SearchResultItem, SearchResultDocument, SearchResultSnippet };