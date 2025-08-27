import React, { useState, useEffect } from "react";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "../services/api";
import { useIndexDocument, useBatchIndexDocuments } from "../hooks/useApi";
import type {
  FoldersResponse,
  DocumentListResponse,
  DocumentDetails,
} from "../types/api";
import { Loader2, Plus } from "lucide-react";

interface FolderNode {
  id: string;
  name: string;
  parentId?: string;
  totalFiles: number;
  children?: FolderNode[];
  documents?: DocumentDetails[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

interface SidebarProps {
  selectedFolderId?: string;
  selectedDocumentId?: string;
  onFolderSelect: (folderId: string) => void;
  onDocumentSelect: (documentId: string, document: DocumentDetails) => void;
}

const updateFolderState = (
  folders: FolderNode[],
  folderId: string,
  updates: Partial<FolderNode>
): FolderNode[] => {
  return folders.map((folder) => {
    if (folder.id === folderId) {
      return { ...folder, ...updates };
    }
    if (folder.children) {
      return {
        ...folder,
        children: updateFolderState(folder.children, folderId, updates),
      };
    }
    return folder;
  });
};

export const Sidebar: React.FC<SidebarProps> = ({
  selectedFolderId,
  selectedDocumentId,
  onFolderSelect,
  onDocumentSelect,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [indexingDocuments, setIndexingDocuments] = useState<Set<string>>(
    new Set()
  );
  const [indexedDocuments, setIndexedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch root folders
  const {
    data: foldersData,
    isLoading: foldersLoading,
    error: foldersError,
  } = useQuery({
    queryKey: ["folders"],
    queryFn: () => apiService.getFolders(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Index document mutation
  const indexDocumentMutation = useIndexDocument({
    onMutate: ({ documentId }) => {
      setIndexingDocuments((prev) => new Set(prev).add(documentId));
    },
    onSuccess: (data, { documentId }) => {
      setIndexingDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      setIndexedDocuments((prev) => new Set(prev).add(documentId));
      // Clear success state after 3 seconds
      setTimeout(() => {
        setIndexedDocuments((prev) => {
          const newSet = new Set(prev);
          newSet.delete(documentId);
          return newSet;
        });
      }, 3000);
    },
    onError: (error, { documentId }) => {
      setIndexingDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
      console.error("Failed to index document:", error);
    },
  });

  // Batch index mutation
  const batchIndexMutation = useBatchIndexDocuments({
    onMutate: ({ documentIds }) => {
      setIndexingDocuments((prev) => {
        const newSet = new Set(prev);
        documentIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    },
    onSuccess: (data, { documentIds }) => {
      setIndexingDocuments((prev) => {
        const newSet = new Set(prev);
        documentIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      setIndexedDocuments((prev) => {
        const newSet = new Set(prev);
        documentIds.forEach((id) => newSet.add(id));
        return newSet;
      });
      setSelectedDocuments(new Set());
      // Clear success state after 3 seconds
      setTimeout(() => {
        setIndexedDocuments(new Set());
      }, 3000);
    },
    onError: (error, { documentIds }) => {
      setIndexingDocuments((prev) => {
        const newSet = new Set(prev);
        documentIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
      console.error("Failed to batch index documents:", error);
    },
  });

  // Build folder tree from flat folder list
  useEffect(() => {
    if (foldersData?.data?.folders) {
      const folders = foldersData.data.folders;
      const tree = buildFolderTree(folders);
      setFolderTree(tree);
    }
  }, [foldersData]);

  const buildFolderTree = (
    folders: Array<{
      id: string;
      name: string;
      parentId?: string;
      totalFiles: number;
    }>
  ): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    // Create folder nodes
    folders.forEach((folder) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        isExpanded: false,
        isLoading: false,
      });
    });

    // Build tree structure
    folders.forEach((folder) => {
      const node = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        parent.children!.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  };

  const toggleFolder = async (folderId: string) => {
    const isExpanded = expandedFolders.has(folderId);

    if (isExpanded) {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    } else {
      setExpandedFolders((prev) => new Set(prev).add(folderId));

      const folder = findFolderInTree(folderTree, folderId);
      if (folder && !folder.documents) {
        // mark as loading
        setFolderTree((prevTree) =>
          updateFolderState(prevTree, folderId, { isLoading: true })
        );

        // fetch child content
        await loadFolderDocuments(folderId);
      }
    }

    onFolderSelect(folderId);
  };

  const findFolderInTree = (
    tree: FolderNode[],
    folderId: string
  ): FolderNode | null => {
    for (const folder of tree) {
      if (folder.id === folderId) return folder;
      if (folder.children) {
        const found = findFolderInTree(folder.children, folderId);
        if (found) return found;
      }
    }
    return null;
  };

  const loadFolderDocuments = async (folderId: string) => {
    try {
      const response = await apiService.getDocuments({ folderId, limit: 100 });
      console.log("response", response);

      setFolderTree((prevTree) => {
        const updateFolder = (folders: FolderNode[]): FolderNode[] => {
          return folders.map((folder) => {
            if (folder.id === folderId) {
              return {
                ...folder,
                documents: response.data.files,
                isLoading: false,
              };
            }
            if (folder.children) {
              return { ...folder, children: updateFolder(folder.children) };
            }
            return folder;
          });
        };
        return updateFolder(prevTree);
      });
    } catch (error) {
      console.error("Failed to load folder documents:", error);
    }
  };

  const handleDocumentClick = (document: DocumentDetails) => {
    onDocumentSelect(document.id, document);
  };

  const handleIndexClick = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    indexDocumentMutation.mutate({ documentId });
  };

  const handleDocumentSelect = (e: React.MouseEvent, documentId: string) => {
    e.stopPropagation();
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleBulkIndex = () => {
    if (selectedDocuments.size > 0) {
      batchIndexMutation.mutate({ documentIds: Array.from(selectedDocuments) });
    }
  };

  const handleSelectAll = () => {
    const allDocuments = new Set<string>();
    const collectDocuments = (folders: FolderNode[]) => {
      folders.forEach((folder) => {
        if (folder.documents) {
          folder.documents.forEach((doc) => allDocuments.add(doc.id));
        }
        if (folder.children) {
          collectDocuments(folder.children);
        }
      });
    };
    collectDocuments(filteredTree);
    setSelectedDocuments(allDocuments);
  };

  const handleDeselectAll = () => {
    setSelectedDocuments(new Set());
  };

  const filteredTree = searchQuery
    ? filterTreeBySearch(folderTree, searchQuery.toLowerCase())
    : folderTree;

  const filterTreeBySearch = (
    tree: FolderNode[],
    query: string
  ): FolderNode[] => {
    return tree.reduce<FolderNode[]>((acc, folder) => {
      const folderMatches = folder.name.toLowerCase().includes(query);
      const filteredChildren = folder.children
        ? filterTreeBySearch(folder.children, query)
        : [];
      const filteredDocuments =
        folder.documents?.filter((doc) =>
          doc.title.toLowerCase().includes(query)
        ) || [];

      if (
        folderMatches ||
        filteredChildren.length > 0 ||
        filteredDocuments.length > 0
      ) {
        acc.push({
          ...folder,
          children: filteredChildren,
          documents: filteredDocuments,
        });
      }
      return acc;
    }, []);
  };

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasDocuments = folder.documents && folder.documents.length > 0;

    return (
      <div key={folder.id} className="select-none">
        <div
          className={`flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-md transition-colors ${
            isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700"
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          <div className="flex items-center flex-1 min-w-0">
            {folder.totalFiles > 0 ? (
              isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              )
            ) : (
              <div className="w-4 mr-1" />
            )}
            <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
            <span className="truncate">{folder.name}</span>
          </div>
          {folder.totalFiles > 0 && (
            <span className="text-xs text-gray-400 ml-1">
              ({folder.totalFiles})
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="ml-4">
            {/* Render documents */}
            {hasDocuments && (
              <div className="mt-1">
                {folder.documents!.map((document) => (
                  <div
                    key={document.id}
                    className={`flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-50 rounded-md transition-colors group ${
                      selectedDocumentId === document.id
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600"
                    }`}
                    style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
                    onClick={() => handleDocumentClick(document)}
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />
                    <span className="truncate flex-1">{document.name}</span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => handleIndexClick(e, document.id)}
                        className="p-1 rounded transition-colors bg-blue-100 text-blue-600"
                        title="Index document"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading state */}
            {folder.isLoading && (
              <div
                className="px-2 py-1.5 text-xs text-gray-500 flex items-center"
                style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (foldersLoading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (foldersError) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="text-red-600 text-sm">
          Failed to load folders. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className={`p-1 rounded transition-colors ${
              showBulkActions
                ? "bg-blue-100 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
            title="Toggle bulk actions"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="mb-3 p-2 bg-gray-50 rounded-md">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>{selectedDocuments.size} selected</span>
              <div className="space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Clear
                </button>
              </div>
            </div>
            <button
              onClick={handleBulkIndex}
              disabled={
                selectedDocuments.size === 0 || batchIndexMutation.isPending
              }
              className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              {batchIndexMutation.isPending ? (
                <>
                  <Cog6ToothIcon className="h-3 w-3 animate-spin" />
                  <span>Indexing...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-3 w-3" />
                  <span>Index Selected ({selectedDocuments.size})</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search folders & docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTree.length > 0 ? (
          <div className="space-y-1">
            {filteredTree.map((folder) => renderFolder(folder))}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm mt-8">
            {searchQuery
              ? "No matching folders or documents found."
              : "No folders available."}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        Total: {foldersData?.total || 0} folders
      </div>
    </div>
  );
};

export default Sidebar;
