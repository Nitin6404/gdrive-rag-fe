# Document Search & RAG Frontend

A React-based frontend application for document search and retrieval-augmented generation (RAG) that integrates with Google Drive, semantic search, and AI-powered question answering.

## Features

### 🔍 Search Capabilities
- **Semantic Search**: Find documents using natural language queries
- **Keyword Search**: Traditional text-based search with highlighting
- **Autocomplete**: Smart suggestions as you type
- **Context Selection**: Filter by folders or document types

### 💬 RAG Chat Interface
- **Conversational AI**: Ask questions about your documents
- **Source Attribution**: See which documents informed each answer
- **Follow-up Questions**: Maintain conversation context
- **Copy & Retry**: Easy interaction with AI responses

### 📄 Document Preview
- **Snippet Extraction**: View relevant text excerpts
- **Metadata Display**: Document details, dates, and ownership
- **Google Drive Integration**: Direct links to original files
- **Expandable Content**: Full document preview capabilities

### 🎨 User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Loading States**: Skeleton screens and progress indicators
- **Error Handling**: Graceful error recovery with retry options
- **Infinite Scroll**: Smooth pagination for large result sets

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn UI** - High-quality component library
- **React Query** - Data fetching, caching, and synchronization
- **Axios** - HTTP client with interceptors
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20.19.0 or higher)
- npm or yarn package manager
- Backend API server running (see backend documentation)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your backend API URL:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build
```

## Project Structure

```
src/
├── components/          # React components
│   ├── SearchBar.tsx    # Search input with autocomplete
│   ├── ResultsList.tsx  # Search results display
│   ├── SnippetPreview.tsx # Document preview panel
│   ├── ChatPanel.tsx    # RAG conversation interface
│   ├── LoadingSkeletons.tsx # Loading state components
│   └── ErrorBoundary.tsx # Error handling components
├── hooks/               # Custom React hooks
│   └── useApi.ts        # API integration hooks
├── services/            # API service layer
│   └── api.ts           # Axios configuration and endpoints
├── types/               # TypeScript type definitions
│   └── api.ts           # API response types
├── lib/                 # Utility functions
│   └── utils.ts         # Helper functions
└── App.tsx              # Main application component
```

## API Integration

The frontend integrates with the following backend endpoints:

### Search Endpoints
- `POST /api/search` - Semantic and keyword search
- `GET /api/search/autocomplete` - Search suggestions

### RAG Endpoints
- `POST /api/rag/query` - AI-powered question answering

### Document Endpoints
- `GET /api/documents/:id` - Fetch document details
- `POST /api/documents` - Upload new documents
- `POST /api/snippets` - Retrieve text snippets

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Development Guidelines

### Code Quality

The project follows these conventions:
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with React and TypeScript rules
- **Component Structure**: Functional components with hooks
- **Error Boundaries**: Graceful error handling

### Performance Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Components loaded on demand
- **Memoization**: React.memo for expensive components
- **Virtual Scrolling**: Efficient rendering of large lists

## Troubleshooting

### Common Issues

1. **API Connection Errors**
   - Verify `VITE_API_URL` is correct
   - Check if backend server is running
   - Ensure CORS is configured on backend

2. **Build Failures**
   - Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
   - Check Node.js version compatibility

3. **Performance Issues**
   - Enable React DevTools Profiler
   - Check network tab for slow API calls
   - Monitor bundle size with `npm run build`

---

**Built with ❤️ using React, TypeScript, and TailwindCSS**
