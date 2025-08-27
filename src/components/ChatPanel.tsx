import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ExternalLink, Copy, RefreshCw, MessageSquare, Loader2, FileText, GitCompare, Layers } from 'lucide-react';
import { useRAGQuery, useConversationRAG, useMultiStepRAG, useSummarizeDocument, useCompareDocuments } from '../hooks/useApi';
import type { RAGQueryRequest, RAGResponse, RAGSource, ConversationHistory } from '../types/api';
import { cn } from '../lib/utils';
import { ChatMessageSkeleton } from './LoadingSkeletons';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  timestamp: Date;
  isLoading?: boolean;
  ragType?: 'standard' | 'conversation' | 'multi-step' | 'summarize' | 'compare';
  metadata?: {
    steps?: number;
    documentIds?: string[];
    summaryType?: string;
  };
}

interface ChatPanelProps {
  initialQuery?: string;
  contextId?: string;
  contextType?: 'folder' | 'document';
  className?: string;
  documentIds?: string[]; // For document comparison and summarization
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  initialQuery = '',
  contextId,
  contextType,
  className,
  documentIds = [],
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string>(`session-${Date.now()}`);
  const [isComposing, setIsComposing] = useState(false);
  const [ragMode, setRagMode] = useState<'standard' | 'conversation' | 'multi-step' | 'summarize' | 'compare'>('standard');
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const ragMutation = useRAGQuery({
    onSuccess: (data: RAGResponse, variables: RAGQueryRequest) => {
      updateLoadingMessage(data.answer, data.sources, 'standard');
      updateConversationHistory(variables.query, data.answer);
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    },
    onError: (error) => {
      updateLoadingMessage(`Sorry, I encountered an error: ${error.message}`, undefined, 'standard');
    },
  });

  const conversationMutation = useConversationRAG({
    onSuccess: (data: RAGResponse, variables) => {
      updateLoadingMessage(data.answer, data.sources, 'conversation');
      updateConversationHistory(variables.message, data.answer);
    },
    onError: (error) => {
      updateLoadingMessage(`Sorry, I encountered an error: ${error.message}`, undefined, 'conversation');
    },
  });

  const multiStepMutation = useMultiStepRAG({
    onSuccess: (data: RAGResponse, variables) => {
      updateLoadingMessage(data.answer, data.sources, 'multi-step', { steps: variables.maxSteps });
      updateConversationHistory(variables.question, data.answer);
    },
    onError: (error) => {
      updateLoadingMessage(`Sorry, I encountered an error: ${error.message}`, undefined, 'multi-step');
    },
  });

  const summarizeMutation = useSummarizeDocument({
    onSuccess: (data: RAGResponse, variables) => {
      updateLoadingMessage(data.answer, data.sources, 'summarize', { 
        documentIds: [variables.documentId],
        summaryType: variables.summaryType 
      });
    },
    onError: (error) => {
      updateLoadingMessage(`Sorry, I encountered an error: ${error.message}`, undefined, 'summarize');
    },
  });

  const compareMutation = useCompareDocuments({
    onSuccess: (data: RAGResponse, variables) => {
      updateLoadingMessage(data.answer, data.sources, 'compare', { 
        documentIds: variables.documentIds 
      });
    },
    onError: (error) => {
      updateLoadingMessage(`Sorry, I encountered an error: ${error.message}`, undefined, 'compare');
    },
  });

  const updateLoadingMessage = (content: string, sources?: RAGSource[], ragType?: 'standard' | 'conversation' | 'multi-step' | 'summarize' | 'compare', metadata?: any) => {
    setMessages(prev => prev.map(msg => 
      msg.isLoading ? {
        ...msg,
        content,
        sources,
        isLoading: false,
        ragType,
        metadata,
      } : msg
    ));
  };

  const updateConversationHistory = (question: string, answer: string) => {
    setConversationHistory(prev => [...prev, { question, answer }]);
  };

  // Handle initial query
  useEffect(() => {
    if (initialQuery && messages.length === 0) {
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (content: string, mode?: typeof ragMode) => {
    const currentMode = mode || ragMode;
    const isAnyMutationPending = ragMutation.isPending || conversationMutation.isPending || 
                                multiStepMutation.isPending || summarizeMutation.isPending || 
                                compareMutation.isPending;
    
    if (!content.trim() || isAnyMutationPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: content.trim(),
      timestamp: new Date(),
      ragType: currentMode,
    };

    const loadingMessage: Message = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
      ragType: currentMode,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInputValue('');

    // Execute based on RAG mode
    switch (currentMode) {
      case 'conversation':
        conversationMutation.mutate({
          sessionId,
          message: content.trim(),
          conversationHistory,
        });
        break;
      
      case 'multi-step':
        multiStepMutation.mutate({
          question: content.trim(),
          maxSteps: 3,
        });
        break;
      
      case 'summarize':
        if (contextId && contextType === 'document') {
          summarizeMutation.mutate({
            documentId: contextId,
            summaryType: 'detailed',
          });
        } else {
          updateLoadingMessage('Please select a document to summarize.', undefined, 'summarize');
        }
        break;
      
      case 'compare':
        if (documentIds.length >= 2) {
          compareMutation.mutate({
            documentIds,
            comparisonAspect: 'content',
            focusAreas: ['similarities', 'differences'],
          });
        } else {
          updateLoadingMessage('Please select at least 2 documents to compare.', undefined, 'compare');
        }
        break;
      
      default:
        // Standard RAG query
        const ragRequest: RAGQueryRequest = {
          question: content.trim(),
          folderId: contextType === 'folder' ? contextId : undefined,
          contextType,
          maxResults: 5,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
        };
        ragMutation.mutate(ragRequest);
        break;
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleRetryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find(msg => msg.type === 'user');
    if (lastUserMessage) {
      // Remove the last assistant message if it exists
      setMessages(prev => {
        const lastAssistantIndex = prev.map(m => m.type).lastIndexOf('assistant');
        if (lastAssistantIndex !== -1) {
          return prev.slice(0, lastAssistantIndex);
        }
        return prev;
      });
      
      handleSendMessage(lastUserMessage.content);
    }
  };

  const handleSourceClick = (source: RAGSource) => {
    window.open(source.driveUrl, '_blank', 'noopener,noreferrer');
  };

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearConversation = () => {
    setMessages([]);
    setConversationId(undefined);
    setSessionId(`session-${Date.now()}`);
    setConversationHistory([]);
    inputRef.current?.focus();
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'summarize':
        setRagMode('summarize');
        if (contextId && contextType === 'document') {
          handleSendMessage('Please provide a detailed summary of this document.', 'summarize');
        } else {
          setInputValue('Please select a document to summarize.');
        }
        break;
      case 'compare':
        setRagMode('compare');
        if (documentIds.length >= 2) {
          handleSendMessage('Please compare these documents.', 'compare');
        } else {
          setInputValue('Please select at least 2 documents to compare.');
        }
        break;
      case 'multi-step':
        setRagMode('multi-step');
        setInputValue('Ask a complex question that requires multi-step reasoning...');
        break;
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
          {contextType && contextId && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
              {contextType === 'folder' ? 'Folder Context' : 'Document Context'}
            </span>
          )}
          {documentIds.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
              {documentIds.length} docs selected
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* RAG Mode Selector */}
          <select
            value={ragMode}
            onChange={(e) => setRagMode(e.target.value as typeof ragMode)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
          >
            <option value="standard">Standard</option>
            <option value="conversation">Conversation</option>
            <option value="multi-step">Multi-step</option>
            <option value="summarize">Summarize</option>
            <option value="compare">Compare</option>
          </select>
          
          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear Chat
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('summarize')}
              disabled={!contextId || contextType !== 'document'}
              className="flex items-center px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-3 w-3 mr-1" />
              Summarize Document
            </button>
            <button
              onClick={() => handleQuickAction('compare')}
              disabled={documentIds.length < 2}
              className="flex items-center px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCompare className="h-3 w-3 mr-1" />
              Compare Documents
            </button>
            <button
              onClick={() => handleQuickAction('multi-step')}
              className="flex items-center px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Layers className="h-3 w-3 mr-1" />
              Complex Analysis
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ask me anything</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              I can help you find information, summarize documents, answer questions, compare documents, and provide multi-step analysis.
              {contextType && ' I\'ll focus on the selected context.'}
              {documentIds.length > 0 && ` I can work with your ${documentIds.length} selected documents.`}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex items-start space-x-3',
                message.type === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.type === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {message.isLoading ? (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              )}
              
              <div className={cn(
                'max-w-3xl',
                message.type === 'user' ? 'order-1' : 'order-2'
              )}>
                <div className={cn(
                  'rounded-lg px-4 py-3',
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}>
                  {message.isLoading ? (
                    <ChatMessageSkeleton />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      {message.ragType && message.ragType !== 'standard' && (
                        <div className="mb-2 flex items-center text-xs text-gray-500">
                          {message.ragType === 'conversation' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {message.ragType === 'multi-step' && <Layers className="h-3 w-3 mr-1" />}
                          {message.ragType === 'summarize' && <FileText className="h-3 w-3 mr-1" />}
                          {message.ragType === 'compare' && <GitCompare className="h-3 w-3 mr-1" />}
                          <span className="capitalize">{message.ragType} Response</span>
                          {message.metadata?.steps && (
                            <span className="ml-1">({message.metadata.steps} steps)</span>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
                
                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Sources
                    </div>
                    <div className="space-y-2">
                      {message.sources.map((source, index) => (
                        <div
                          key={index}
                          onClick={() => handleSourceClick(source)}
                          className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {source.title}
                              </h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {source.snippet}
                              </p>
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <span>Relevance: {Math.round(source.relevanceScore * 100)}%</span>
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Message Actions */}
                {!message.isLoading && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    
                    {message.type === 'assistant' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCopyMessage(message.content)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          title="Copy message"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          onClick={handleRetryLastMessage}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          title="Retry"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {message.type === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center order-2">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleInputSubmit} className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="Ask a question or request a summary..."
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              style={{ minHeight: '48px', maxHeight: '120px' }}
              disabled={ragMutation.isPending || conversationMutation.isPending || multiStepMutation.isPending || summarizeMutation.isPending || compareMutation.isPending}
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || ragMutation.isPending || conversationMutation.isPending || multiStepMutation.isPending || summarizeMutation.isPending || compareMutation.isPending}
              className="flex-shrink-0 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {(ragMutation.isPending || conversationMutation.isPending || multiStepMutation.isPending || summarizeMutation.isPending || compareMutation.isPending) ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;