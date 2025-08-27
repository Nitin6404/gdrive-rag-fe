import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ExternalLink, FileText } from 'lucide-react';
import { apiService } from '../services/api';
import { LoadingSpinner } from './LoadingSkeletons';

interface SnippetViewProps {
  documentId: string;
  chunkIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function SnippetView({
  documentId,
  chunkIndex,
  isOpen,
  onClose,
}: SnippetViewProps) {
  const {
    data: snippetData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['snippet', documentId, chunkIndex],
    queryFn: () => apiService.getSpecificSnippet(documentId, chunkIndex),
    enabled: isOpen && !!documentId && chunkIndex !== undefined,
  });

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const openInDrive = () => {
    if (documentId) {
      window.open(`https://drive.google.com/file/d/${documentId}`, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Document Snippet
              </h2>
              <p className="text-sm text-gray-500">
                Chunk {chunkIndex + 1} from document
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={openInDrive}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              title="Open in Google Drive"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Drive</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">Loading snippet...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Failed to load snippet</p>
                <p className="text-sm text-gray-500 mt-1">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
              </div>
            </div>
          ) : snippetData ? (
            <div className="space-y-6">
              {/* Snippet Metadata */}
              {snippetData.metadata && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Document Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {snippetData.metadata.title && (
                      <div>
                        <span className="font-medium text-gray-700">Title:</span>
                        <span className="ml-2 text-gray-600">
                          {snippetData.metadata.title}
                        </span>
                      </div>
                    )}
                    {snippetData.metadata.author && (
                      <div>
                        <span className="font-medium text-gray-700">Author:</span>
                        <span className="ml-2 text-gray-600">
                          {snippetData.metadata.author}
                        </span>
                      </div>
                    )}
                    {snippetData.metadata.createdAt && (
                      <div>
                        <span className="font-medium text-gray-700">Created:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(snippetData.metadata.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {snippetData.metadata.modifiedAt && (
                      <div>
                        <span className="font-medium text-gray-700">Modified:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(snippetData.metadata.modifiedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Snippet Content */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Snippet Content
                  </h3>
                  {snippetData.relevanceScore !== undefined && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">Relevance:</span>
                      <span className="text-sm font-medium text-blue-600">
                        {(snippetData.relevanceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {snippetData.content}
                  </div>
                </div>
              </div>

              {/* Context Information */}
              {(snippetData.startIndex !== undefined || snippetData.endIndex !== undefined) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Position in Document
                  </h4>
                  <div className="text-sm text-blue-800">
                    {snippetData.startIndex !== undefined && snippetData.endIndex !== undefined ? (
                      <p>
                        Characters {snippetData.startIndex.toLocaleString()} - {snippetData.endIndex.toLocaleString()}
                      </p>
                    ) : (
                      <p>Chunk {chunkIndex + 1}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No snippet data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={openInDrive}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 transition-colors"
          >
            Open in Google Drive
          </button>
        </div>
      </div>
    </div>
  );
}