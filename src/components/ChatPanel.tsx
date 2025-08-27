import React, { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "../services/api";
import type { RAGQueryRequest, RAGResponse, RAGSource } from "../types/api";
import SnippetView from "./SnippetView";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatPanelProps {
  selectedFolderId?: string;
  selectedDocumentId?: string;
  className?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedFolderId,
  selectedDocumentId,
  className,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<{
    documentId: string;
    chunkIndex: number;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // RAG Query Mutation
  const ragMutation = useMutation({
    mutationFn: (request: RAGQueryRequest) => apiService.ragQuery(request),
    onSuccess: (data: RAGResponse) => {
      console.log("RAG Query Success:", data);
      const resData = data?.data;
      updateLoadingMessage(resData.answer, resData.sources);
    },
    onError: (error: any) => {
      updateLoadingMessage(
        `Sorry, I encountered an error: ${error.message || "Unknown error occurred"}`,
        undefined
      );
    },
  });

  const updateLoadingMessage = (content: string, sources?: RAGSource[]) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.isLoading
          ? {
              ...msg,
              content,
              sources,
              isLoading: false,
            }
          : msg
      )
    );
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || ragMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: `assistant-${Date.now()}`,
      type: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInputValue("");

    // Create RAG request
    const ragRequest: RAGQueryRequest = {
      question: content.trim(),
      folderId: selectedFolderId,
      documentId: selectedDocumentId,
      maxResults: 5,
    };

    ragMutation.mutate(ragRequest);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleRetryLastMessage = () => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.type === "user");
    if (lastUserMessage) {
      // Remove the last assistant message if it exists
      setMessages((prev) => {
        const lastAssistantIndex = prev
          .map((m) => m.type)
          .lastIndexOf("assistant");
        if (lastAssistantIndex !== -1) {
          return prev.slice(0, lastAssistantIndex);
        }
        return prev;
      });

      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleSourceClick = (source: RAGSource) => {
    // Create Google Drive URL from document ID
    const driveUrl = `https://drive.google.com/file/d/${source.documentId}`;
    window.open(driveUrl, "_blank", "noopener,noreferrer");
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const clearConversation = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className || ""}`}>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Assistant
              </h2>
              <p className="text-sm text-gray-500">
                {selectedFolderId
                  ? `Searching in selected folder`
                  : selectedDocumentId
                    ? `Document context`
                    : "Ask questions about your documents"}
              </p>
            </div>
          </div>

          <button
            onClick={clearConversation}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear conversation"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ask me anything
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              I can help you find information in your documents and answer
              questions.
              {selectedFolderId && " I'll search within the selected folder."}
              {selectedDocumentId && " I'll focus on the selected document."}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {message.isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  ) : (
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              )}

              <div
                className={`max-w-3xl ${
                  message.type === "user" ? "order-1" : "order-2"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-3 ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {message.isLoading ? (
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">
                      Sources:
                    </h4>
                    {message.sources.map((source, index) => (
                      <div
                        key={index}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (
                            source.documentId &&
                            source.chunkIndex !== undefined
                          ) {
                            setSelectedSnippet({
                              documentId: source.documentId,
                              chunkIndex: source.chunkIndex,
                            });
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <DocumentTextIcon className="w-4 h-4 text-gray-500" />
                              <h5 className="text-sm font-medium text-gray-900 truncate">
                                {source.fileName || "Untitled Document"}
                              </h5>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {source.snippet}
                            </p>
                            <div className="flex items-center mt-2 space-x-2">
                              <span className="text-xs text-gray-400">
                                Relevance:{" "}
                                {Math.round(source.relevanceScore * 100)}%
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              Click to view full snippet
                            </p>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  source.documentId &&
                                  source.chunkIndex !== undefined
                                ) {
                                  setSelectedSnippet({
                                    documentId: source.documentId,
                                    chunkIndex: source.chunkIndex,
                                  });
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="View snippet"
                            >
                              <DocumentTextIcon className="w-4 h-4" />
                            </button>
                            <a
                              href={`https://drive.google.com/file/d/${source.documentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Open in Google Drive"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Actions */}
                {!message.isLoading && message.type === "assistant" && (
                  <div className="flex items-center space-x-2 mt-3">
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={handleRetryLastMessage}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Timestamp */}
                {!message.isLoading && (
                  <div className="text-xs text-gray-500 mt-2">
                    {formatTimestamp(message.timestamp)}
                  </div>
                )}
              </div>

              {message.type === "user" && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center order-2">
                  <UserIcon className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <form onSubmit={handleInputSubmit} className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Ask a question about your documents..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              style={{
                minHeight: "48px",
                maxHeight: "120px",
                height: "auto",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || ragMutation.isPending}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {ragMutation.isPending ? (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <PaperAirplaneIcon className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>

      {/* Snippet View Modal */}
      {selectedSnippet && (
        <SnippetView
          documentId={selectedSnippet.documentId}
          chunkIndex={selectedSnippet.chunkIndex}
          isOpen={!!selectedSnippet}
          onClose={() => setSelectedSnippet(null)}
        />
      )}
    </div>
  );
};

export default ChatPanel;
