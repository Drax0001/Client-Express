# Design Document: Upload & Train RAG Chatbot System

## Overview

This design document specifies the architecture and implementation details for an Upload & Train system that enables users to create custom RAG-powered chatbots. The system provides a complete workflow from document upload through training to deployment, using LangChain for orchestration, Google Gemini for AI capabilities, and ChromaDB for vector storage.

The core principle is **knowledge boundary enforcement**: each chatbot is strictly limited to answering questions based only on its trained documents, preventing hallucinations and ensuring factual responses grounded in user-provided content.

**Key Design Principles:**

- User-friendly upload interfaces with drag-and-drop and URL support
- Asynchronous training pipeline with real-time progress updates
- Project-level data isolation and security
- Streaming responses for optimal user experience
- Comprehensive error handling and recovery options
- Scalable architecture supporting concurrent training sessions

## Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Frontend)                     │
│  Upload Interface • Training Progress • Chat Interface  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js API Routes (Controllers)            │
│  /api/upload • /api/train • /api/chatbots • /api/chat    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Training Service Layer                 │
│  UploadService • TrainingService • ChatbotService       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────┬──────────────────────────────────┐
│   RAG Pipeline       │      Database Layer              │
│  - Text Extraction   │   - Prisma Client                │
│  - Chunking          │   - PostgreSQL                   │
│  - Embedding         │                                  │
│  - Vector Storage    │                                  │
│  - Model Training    │                                  │
└──────────────────────┴──────────────────────────────────┘
                            ↓
┌──────────────────────┬──────────────────────────────────┐
│   Vector Database    │      LLM Provider                │
│   ChromaDB           │   Google Gemini / Local LLM      │
└──────────────────────┴──────────────────────────────────┘
```

### Data Flow

**Upload & Train Flow:**

1. Client uploads documents → API validates and stores files temporarily
2. Client configures training → API creates training session with parameters
3. Training service processes documents asynchronously:
   - Extract text from PDFs, DOCX, TXT, URLs
   - Chunk text with configurable parameters
   - Generate embeddings using Gemini
   - Store vectors in ChromaDB with project isolation
   - Update training status and progress
4. Training completes → Chatbot becomes available for queries
5. Client queries chatbot → RAG pipeline retrieves relevant chunks and generates responses

## Components and Interfaces

### 1. API Route Handlers

**POST /api/upload**

```typescript
Request: FormData {
  files: File[]          // Multiple file uploads
  urls: string[]         // Multiple URL strings
  projectName: string    // Optional project name
}

Response: {
  uploadId: string
  files: Array<{
    id: string
    name: string
    size: number
    type: string
    status: "pending" | "validating" | "ready" | "failed"
  }>
  urls: Array<{
    id: string
    url: string
    status: "pending" | "validating" | "ready" | "failed"
  }>
}
```

**POST /api/train**

```typescript
Request: {
  uploadId: string
  configuration: {
    chunkSize: number        // 500-2000, default 1000
    chunkOverlap: number     // 0-500, default 200
    embeddingModel: string   // "gemini" | "local"
    temperature: number      // 0.0-0.5, default 0.3
    name: string            // Chatbot name
    description: string     // Chatbot description
  }
}

Response: {
  trainingId: string
  chatbotId: string
  status: "queued" | "processing" | "completed" | "failed"
  estimatedDuration: number  // in seconds
}
```

**GET /api/train/:trainingId/progress**

```typescript
Response: {
  status: "processing" | "completed" | "failed"
  currentStep: "uploading" | "extracting" | "chunking" | "embedding" | "storing"
  progress: number          // 0-100
  currentFile?: string      // Current file being processed
  errors: string[]          // Any errors encountered
  estimatedTimeRemaining: number
}
```

**GET /api/chatbots**

```typescript
Response: Array<{
  id: string
  name: string
  description: string
  createdAt: string
  documentCount: number
  lastQueriedAt?: string
  queryCount: number
  status: "training" | "ready" | "failed"
}>
```

**POST /api/chat**

```typescript
Request: {
  chatbotId: string
  message: string
  conversationId?: string   // For conversation continuity
}

Response: {
  messageId: string
  answer: string
  sources: Array<{
    documentId: string
    filename: string
    chunkIndex: number
    text: string
    score: number
  }>
  conversationId: string
}
```

### 2. Service Layer

**UploadService**

```typescript
interface UploadService {
  validateAndStoreFiles(files: File[]): Promise<ValidatedFile[]>
  validateAndStoreUrls(urls: string[]): Promise<ValidatedUrl[]>
  createUploadSession(files: ValidatedFile[], urls: ValidatedUrl[]): Promise<UploadSession>
  cleanupUploadSession(uploadId: string): Promise<void>
}
```

**TrainingService**

```typescript
interface TrainingService {
  startTraining(uploadId: string, config: TrainingConfig): Promise<TrainingSession>
  getTrainingProgress(trainingId: string): Promise<TrainingProgress>
  cancelTraining(trainingId: string): Promise<void>
  processDocuments(uploadSession: UploadSession, config: TrainingConfig): Promise<TrainedChatbot>
}
```

**ChatbotService**

```typescript
interface ChatbotService {
  getChatbots(userId: string): Promise<Chatbot[]>
  getChatbot(chatbotId: string): Promise<Chatbot>
  deleteChatbot(chatbotId: string): Promise<void>
  updateChatbot(chatbotId: string, updates: Partial<Chatbot>): Promise<Chatbot>
  processQuery(chatbotId: string, message: string, conversationId?: string): Promise<ChatResponse>
}
```

### 3. Training Pipeline Components

**DocumentProcessor**

```typescript
interface DocumentProcessor {
  processFile(file: ValidatedFile): Promise<ProcessedDocument>
  processUrl(url: ValidatedUrl): Promise<ProcessedDocument>
  validateDocument(document: ProcessedDocument): Promise<ValidationResult>
}

interface ProcessedDocument {
  id: string
  filename: string
  content: string
  metadata: {
    type: "pdf" | "docx" | "txt" | "url"
    size: number
    extractedAt: Date
    url?: string
  }
}
```

**TextChunker**

```typescript
interface TextChunker {
  chunkTexts(documents: ProcessedDocument[], config: ChunkingConfig): Promise<TextChunk[]>
  optimizeChunks(chunks: TextChunk[]): Promise<OptimizedChunk[]>
}

interface TextChunk {
  id: string
  documentId: string
  text: string
  metadata: {
    chunkIndex: number
    startPosition: number
    endPosition: number
    tokenCount: number
  }
}
```

**EmbeddingGenerator**

```typescript
interface EmbeddingGenerator {
  generateEmbeddings(chunks: TextChunk[], model: string): Promise<EmbeddedChunk[]>
  validateEmbeddings(embeddings: number[][]): Promise<ValidationResult>
}

interface EmbeddedChunk extends TextChunk {
  embedding: number[]
  model: string
  generatedAt: Date
}
```

**VectorStoreManager**

```typescript
interface VectorStoreManager {
  createChatbotCollection(chatbotId: string): Promise<void>
  storeEmbeddings(chatbotId: string, embeddings: EmbeddedChunk[]): Promise<void>
  optimizeCollection(chatbotId: string): Promise<void>
  deleteCollection(chatbotId: string): Promise<void>
}
```

### 4. Frontend Components

**UploadInterface**

```typescript
interface UploadInterfaceProps {
  onUploadComplete: (uploadId: string) => void
  maxFiles?: number
  maxFileSize?: number
  acceptedTypes?: string[]
}
```

**TrainingProgress**

```typescript
interface TrainingProgressProps {
  trainingId: string
  onComplete: (chatbotId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}
```

**ChatInterface**

```typescript
interface ChatInterfaceProps {
  chatbotId: string
  onMessage?: (message: ChatMessage) => void
  showSources?: boolean
  maxSources?: number
}
```

## Data Models

### Core Domain Models

**UploadSession**

```typescript
interface UploadSession {
  id: string
  userId: string
  createdAt: Date
  status: "active" | "completed" | "expired"
  files: ValidatedFile[]
  urls: ValidatedUrl[]
  expiresAt: Date
}
```

**ValidatedFile**

```typescript
interface ValidatedFile {
  id: string
  file: File
  status: "pending" | "validating" | "ready" | "failed"
  validationErrors?: string[]
  metadata: {
    name: string
    size: number
    type: string
    lastModified: Date
  }
}
```

**TrainingSession**

```typescript
interface TrainingSession {
  id: string
  uploadId: string
  chatbotId: string
  config: TrainingConfig
  status: "queued" | "processing" | "completed" | "failed" | "cancelled"
  progress: TrainingProgress
  startedAt?: Date
  completedAt?: Date
  errors?: string[]
}
```

**Chatbot**

```typescript
interface Chatbot {
  id: string
  userId: string
  name: string
  description: string
  config: TrainingConfig
  status: "training" | "ready" | "failed"
  createdAt: Date
  updatedAt: Date
  documentCount: number
  lastQueriedAt?: Date
  queryCount: number
  totalTokens: number
}
```

**TrainingConfig**

```typescript
interface TrainingConfig {
  chunkSize: number
  chunkOverlap: number
  embeddingModel: string
  temperature: number
  maxTokens: number
  relevanceThreshold: number
}
```

## Implementation Details

### Upload Workflow

**File Upload Processing:**

```typescript
async function processFileUpload(files: FileList): Promise<ValidatedFile[]> {
  const validatedFiles: ValidatedFile[] = []

  for (const file of Array.from(files)) {
    const validation = await validateFile(file)

    validatedFiles.push({
      id: generateId(),
      file,
      status: validation.isValid ? "ready" : "failed",
      validationErrors: validation.errors,
      metadata: {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified)
      }
    })
  }

  return validatedFiles
}
```

**URL Validation:**

```typescript
async function validateUrl(url: string): Promise<UrlValidationResult> {
  try {
    // Check URL format
    new URL(url)

    // Attempt to fetch headers to verify accessibility
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 5000
    })

    return {
      isValid: response.ok,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    }
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    }
  }
}
```

### Training Pipeline

**Complete Training Flow:**

```typescript
async function executeTraining(uploadId: string, config: TrainingConfig): Promise<Chatbot> {
  // 1. Create chatbot record
  const chatbot = await createChatbotRecord(config)

  // 2. Get upload session
  const session = await getUploadSession(uploadId)

  // 3. Process all documents
  const processedDocs = await processAllDocuments(session)

  // 4. Chunk texts
  const chunks = await chunkTexts(processedDocs, config)

  // 5. Generate embeddings
  const embeddedChunks = await generateEmbeddings(chunks, config)

  // 6. Store in vector database
  await storeEmbeddings(chatbot.id, embeddedChunks)

  // 7. Update chatbot status
  await updateChatbotStatus(chatbot.id, "ready")

  return chatbot
}
```

**Progress Tracking:**

```typescript
class TrainingProgressTracker {
  private steps = [
    { name: "validation", weight: 5 },
    { name: "extraction", weight: 20 },
    { name: "chunking", weight: 10 },
    { name: "embedding", weight: 50 },
    { name: "storage", weight: 15 }
  ]

  updateProgress(stepIndex: number, subProgress: number = 100): TrainingProgress {
    const completedSteps = this.steps.slice(0, stepIndex)
    const currentStep = this.steps[stepIndex]

    const completedWeight = completedSteps.reduce((sum, step) => sum + step.weight, 0)
    const currentWeight = (subProgress / 100) * currentStep.weight

    return {
      currentStep: currentStep.name,
      progress: Math.round(completedWeight + currentWeight),
      estimatedTimeRemaining: this.calculateTimeRemaining(stepIndex, subProgress)
    }
  }
}
```

### Query Processing

**RAG Query Flow:**

```typescript
async function processChatQuery(chatbotId: string, message: string): Promise<ChatResponse> {
  // 1. Generate query embedding
  const queryEmbedding = await embeddingService.generateEmbedding(message)

  // 2. Search for relevant chunks
  const searchResults = await vectorStore.similaritySearch(chatbotId, queryEmbedding, 5)

  // 3. Check relevance threshold
  if (!searchResults.length || searchResults[0].score < 0.75) {
    return {
      answer: "I don't know",
      sources: [],
      sourceCount: 0
    }
  }

  // 4. Assemble context
  const context = assembleContext(searchResults)

  // 5. Generate response
  const systemPrompt = buildSystemPrompt()
  const userPrompt = buildUserPrompt(context, message)

  const response = await llmService.generateResponse(systemPrompt, userPrompt)

  return {
    answer: response,
    sources: searchResults,
    sourceCount: searchResults.length
  }
}
```

**Context Assembly:**

```typescript
function assembleContext(searchResults: SearchResult[]): string {
  const sorted = searchResults.sort((a, b) => b.score - a.score)

  let context = ""
  let tokenCount = 0
  const maxTokens = 3000

  for (const result of sorted) {
    const chunkTokens = estimateTokens(result.text)
    if (tokenCount + chunkTokens > maxTokens) break

    context += result.text + "\n\n"
    tokenCount += chunkTokens
  }

  return context.trim()
}
```

## Database Schema Extensions

**Extended Prisma Schema:**

```prisma
model Chatbot {
  id            String   @id @default(cuid())
  userId        String
  name          String
  description   String?
  config        Json     // TrainingConfig as JSON
  status        String   // "training" | "ready" | "failed"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @default(now())
  documentCount Int      @default(0)
  lastQueriedAt DateTime?
  queryCount    Int      @default(0)
  totalTokens   Int      @default(0)

  // Relations
  trainingSessions TrainingSession[]
  conversations    Conversation[]

  @@map("chatbots")
}

model TrainingSession {
  id          String   @id @default(cuid())
  chatbotId   String
  uploadId    String
  status      String   // "queued" | "processing" | "completed" | "failed"
  progress    Json     // TrainingProgress as JSON
  config      Json     // TrainingConfig as JSON
  startedAt   DateTime?
  completedAt DateTime?
  errors      Json?    // string[] as JSON
  createdAt   DateTime @default(now())

  chatbot Chatbot @relation(fields: [chatbotId], references: [id])

  @@map("training_sessions")
}

model Conversation {
  id        String   @id @default(cuid())
  chatbotId String
  userId    String
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())

  chatbot   Chatbot          @relation(fields: [chatbotId], references: [id])
  messages  ChatMessage[]

  @@map("conversations")
}

model ChatMessage {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // "user" | "assistant"
  content        String
  sources        Json?    // ChatSource[] as JSON
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id])

  @@map("chat_messages")
}
```

## Error Handling Strategy

**Training Error Handling:**

```typescript
class TrainingErrorHandler {
  async handleError(error: Error, trainingId: string): Promise<void> {
    const errorType = categorizeError(error)

    switch (errorType) {
      case "validation":
        await updateTrainingStatus(trainingId, "failed", error.message)
        break

      case "quota":
        await updateTrainingStatus(trainingId, "failed", "API quota exceeded. Try reducing document volume.")
        break

      case "network":
        // Retry with exponential backoff
        await retryWithBackoff(() => resumeTraining(trainingId))
        break

      case "processing":
        await updateTrainingStatus(trainingId, "failed", "Document processing failed. Check file formats.")
        break

      default:
        await updateTrainingStatus(trainingId, "failed", "Training failed unexpectedly.")
    }
  }
}
```

**User-Friendly Error Messages:**

```typescript
const ERROR_MESSAGES = {
  FILE_TOO_LARGE: "File size exceeds the maximum limit. Please choose a smaller file.",
  INVALID_FILE_TYPE: "File type not supported. Please use PDF, DOCX, or TXT files.",
  URL_UNACCESSIBLE: "Unable to access the provided URL. Please check the link and try again.",
  TRAINING_FAILED: "Training failed. Please try again or contact support if the issue persists.",
  QUOTA_EXCEEDED: "API quota exceeded. Please try again later or upgrade your plan.",
  NETWORK_ERROR: "Connection failed. Please check your internet connection and try again."
}
```

## Frontend Implementation

### Upload Interface Component

```typescript
function UploadInterface({ onUploadComplete }: UploadInterfaceProps) {
  const [files, setFiles] = useState<File[]>([])
  const [urls, setUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async () => {
    setIsUploading(true)

    try {
      const formData = new FormData()

      files.forEach(file => formData.append('files', file))
      urls.forEach(url => formData.append('urls', url))

      const response = await apiClient.post('/upload', formData)
      onUploadComplete(response.data.uploadId)

    } catch (error) {
      toast.error("Upload failed", { description: error.message })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="upload-interface">
      <FileUploadArea
        onFileSelect={setFiles}
        disabled={isUploading}
      />

      <UrlUploadInput
        onUrlAdd={(url) => setUrls([...urls, url])}
        onUrlRemove={(index) => setUrls(urls.filter((_, i) => i !== index))}
        disabled={isUploading}
      />

      <Button
        onClick={handleUpload}
        disabled={files.length === 0 && urls.length === 0 || isUploading}
      >
        {isUploading ? "Uploading..." : "Start Upload"}
      </Button>
    </div>
  )
}
```

### Training Progress Component

```typescript
function TrainingProgress({ trainingId, onComplete }: TrainingProgressProps) {
  const [progress, setProgress] = useState<TrainingProgress | null>(null)

  useEffect(() => {
    const pollProgress = async () => {
      try {
        const response = await apiClient.get(`/train/${trainingId}/progress`)
        setProgress(response.data)

        if (response.data.status === 'completed') {
          onComplete(response.data.chatbotId)
        } else if (response.data.status === 'failed') {
          onError(response.data.errors?.[0] || 'Training failed')
        } else {
          setTimeout(pollProgress, 2000) // Poll every 2 seconds
        }
      } catch (error) {
        onError('Failed to check training progress')
      }
    }

    pollProgress()
  }, [trainingId])

  if (!progress) return <div>Loading...</div>

  return (
    <div className="training-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress.progress}%` }}
        />
      </div>

      <div className="progress-details">
        <p>Current step: {progress.currentStep}</p>
        <p>Progress: {progress.progress}%</p>
        {progress.estimatedTimeRemaining && (
          <p>Estimated time: {Math.round(progress.estimatedTimeRemaining / 60)} minutes</p>
        )}
      </div>
    </div>
  )
}
```

## Security Considerations

**Data Isolation:**

- Each chatbot's vectors stored in separate ChromaDB collections
- Database-level row security policies
- User session validation for all API calls

**Input Validation:**

- File type validation using magic bytes, not just extensions
- URL validation with allowlist of domains if needed
- Content length limits to prevent abuse

**Rate Limiting:**

- Per-user upload limits
- Training session concurrency limits
- Query rate limits per chatbot

## Performance Optimizations

**Batch Processing:**

```typescript
async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize: number = 10
): Promise<any[]> {
  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }

  return results
}
```

**Caching Strategy:**

- Embeddings cached for frequently queried chunks
- Training progress cached in Redis/memory
- Static file serving with CDN

**Streaming Responses:**

- Real-time progress updates using Server-Sent Events
- Chunked responses for large file uploads
- Streaming chat responses for better UX

## Monitoring and Analytics

**Training Metrics:**

```typescript
interface TrainingMetrics {
  duration: number
  documentsProcessed: number
  chunksGenerated: number
  embeddingsCreated: number
  storageUsed: number
  errors: string[]
}
```

**Usage Analytics:**

```typescript
interface ChatbotAnalytics {
  queriesPerDay: number
  averageResponseTime: number
  topQueries: string[]
  sourceUtilization: number // percentage of responses with sources
  userSatisfaction: number  // based on user feedback
}
```

This comprehensive design provides a scalable, user-friendly system for creating custom RAG chatbots with robust error handling, progress tracking, and performance optimizations.