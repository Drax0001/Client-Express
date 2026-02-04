"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Check, Upload, Settings, Play, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

// Import our components
import { FileUploadArea } from "@/components/upload-train/file-upload-area"
import { UrlUploadInput } from "@/components/upload-train/url-upload-input"
import { TrainingConfig, TrainingConfig as TrainingConfigComponent } from "@/components/upload-train/training-config"
import { TrainingProgress } from "@/components/upload-train/training-progress"

interface ValidatedFile {
  id: string
  file: File
  status: 'pending' | 'validating' | 'ready' | 'error'
  validationErrors: string[]
  metadata: {
    name: string
    size: number
    type: string
    detectedType?: string
  }
}

interface ValidatedUrl {
  id: string
  url: string
  status: 'pending' | 'validating' | 'ready' | 'error'
  validationErrors: string[]
  metadata?: {
    title?: string
    contentType?: string
    size?: number
    lastModified?: string
  }
}

type Step = 'upload' | 'configure' | 'train' | 'complete'

interface TrainingProgress {
  trainingId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  currentStep: 'uploading' | 'extracting' | 'chunking' | 'embedding' | 'storing' | string
  progress: number
  currentFile?: string
  errors: string[]
  estimatedTimeRemaining?: number
  startedAt?: Date
  completedAt?: Date
}

export default function UploadPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState<Step>('upload')
  const [files, setFiles] = React.useState<ValidatedFile[]>([])
  const [urls, setUrls] = React.useState<ValidatedUrl[]>([])
  const [config, setConfig] = React.useState<TrainingConfig>({
    name: '',
    description: '',
    chunkSize: 1000,
    chunkOverlap: 200,
    embeddingModel: 'gemini',
    temperature: 0.3,
    maxTokens: 1024,
  })
  const [trainingProgress, setTrainingProgress] = React.useState<TrainingProgress | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Mock API functions (replace with actual API calls)
  const uploadFiles = async (files: ValidatedFile[], urls: ValidatedUrl[]) => {
    // Simulate upload API call
    const uploadData = new FormData()

    files.forEach((file) => {
      if (file.status === 'ready') {
        uploadData.append('files', file.file)
      }
    })

    urls.forEach((url) => {
      if (url.status === 'ready') {
        uploadData.append('urls', url.url)
      }
    })

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: uploadData,
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    return response.json()
  }

  const startTraining = async (uploadId: string, config: TrainingConfig) => {
    const response = await fetch('/api/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadId,
        configuration: config,
      }),
    })

    if (!response.ok) {
      throw new Error('Training failed to start')
    }

    return response.json()
  }

  const checkTrainingProgress = async (trainingId: string) => {
    const response = await fetch(`/api/train/${trainingId}/progress`)

    if (!response.ok) {
      throw new Error('Failed to check progress')
    }

    return response.json()
  }

  const canProceedToConfigure = () => {
    const hasValidFiles = files.some(f => f.status === 'ready')
    const hasValidUrls = urls.some(u => u.status === 'ready')
    return hasValidFiles || hasValidUrls
  }

  const canProceedToTrain = () => {
    return config.name.trim().length > 0
  }

  const handleNext = async () => {
    setError(null)

    if (currentStep === 'upload') {
      if (!canProceedToConfigure()) {
        setError('Please upload at least one valid file or URL before continuing.')
        return
      }
      setCurrentStep('configure')
    } else if (currentStep === 'configure') {
      if (!canProceedToTrain()) {
        setError('Please provide a name for your chatbot.')
        return
      }
      setCurrentStep('train')
    } else if (currentStep === 'train') {
      await handleStartTraining()
    }
  }

  const handleBack = () => {
    setError(null)

    if (currentStep === 'configure') {
      setCurrentStep('upload')
    } else if (currentStep === 'train') {
      setCurrentStep('configure')
    } else if (currentStep === 'complete') {
      setCurrentStep('train')
    }
  }

  const handleStartTraining = async () => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Step 1: Upload files and URLs
      const uploadResult = await uploadFiles(files, urls)

      // Step 2: Start training
      const trainingResult = await startTraining(uploadResult.uploadId, config)

      setTrainingProgress({
        trainingId: trainingResult.trainingId,
        status: 'queued',
        currentStep: 'uploading',
        progress: 0,
        errors: [],
      })

      setCurrentStep('train')

      // Start polling for progress
      pollTrainingProgress(trainingResult.trainingId)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const pollTrainingProgress = async (trainingId: string) => {
    const poll = async () => {
      try {
        const progress = await checkTrainingProgress(trainingId)
        setTrainingProgress(progress)

        if (progress.status === 'completed') {
          setCurrentStep('complete')
        } else if (progress.status === 'failed') {
          // Stay on train step to show error
        } else {
          // Continue polling
          setTimeout(poll, 2000)
        }
      } catch (err) {
        console.error('Failed to check training progress:', err)
        setTimeout(poll, 5000) // Retry with longer interval
      }
    }

    poll()
  }

  const handleCancelTraining = () => {
    // In a real implementation, you'd call an API to cancel training
    setTrainingProgress(null)
    setCurrentStep('configure')
  }

  const handleRetryTraining = () => {
    if (trainingProgress) {
      setTrainingProgress({
        ...trainingProgress,
        status: 'queued',
        progress: 0,
        errors: [],
      })
      pollTrainingProgress(trainingProgress.trainingId)
    }
  }

  const handleComplete = () => {
    router.push('/chatbots')
  }

  const getStepProgress = () => {
    switch (currentStep) {
      case 'upload': return 25
      case 'configure': return 50
      case 'train': return 75
      case 'complete': return 100
      default: return 0
    }
  }

  const steps = [
    { id: 'upload', title: 'Upload', description: 'Add documents and URLs', icon: Upload },
    { id: 'configure', title: 'Configure', description: 'Set training parameters', icon: Settings },
    { id: 'train', title: 'Train', description: 'Create your chatbot', icon: Play },
    { id: 'complete', title: 'Complete', description: 'Ready to chat', icon: Bot },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Chatbot</h1>
          <p className="text-muted-foreground">
            Upload documents and configure your AI chatbot in a few simple steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index
              const Icon = step.icon

              return (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className={cn(
                      "text-sm font-medium",
                      isActive && "text-primary",
                      isCompleted && "text-green-600"
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "w-12 h-0.5 mx-4",
                      isCompleted ? "bg-green-500" : "bg-muted-foreground/30"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card className="min-h-[600px]">
          <CardContent className="p-6">
            {currentStep === 'upload' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Upload Documents</h2>
                  <p className="text-muted-foreground">
                    Add the documents and web pages you want your chatbot to learn from.
                    Supported formats: PDF, DOCX, TXT, HTML, Markdown.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Files</h3>
                    <FileUploadArea
                      files={files}
                      onFilesChange={setFiles}
                      maxFiles={20}
                      maxFileSize={10 * 1024 * 1024}
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">URLs</h3>
                    <UrlUploadInput
                      urls={urls}
                      onUrlsChange={setUrls}
                      maxUrls={10}
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {files.filter(f => f.status === 'ready').length} files ready
                    </Badge>
                    <Badge variant="secondary">
                      {urls.filter(u => u.status === 'ready').length} URLs ready
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: {files.filter(f => f.status === 'ready').length + urls.filter(u => u.status === 'ready').length} items
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'configure' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Configure Training</h2>
                  <p className="text-muted-foreground">
                    Customize how your documents will be processed and how your chatbot will respond.
                  </p>
                </div>

                <TrainingConfigComponent
                  config={config}
                  onConfigChange={setConfig}
                />
              </div>
            )}

            {currentStep === 'train' && trainingProgress && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Training in Progress</h2>
                  <p className="text-muted-foreground">
                    Your chatbot is being trained on the uploaded content. This may take a few minutes.
                  </p>
                </div>

                <TrainingProgress
                  progress={trainingProgress}
                  onCancel={handleCancelTraining}
                  onRetry={handleRetryTraining}
                />
              </div>
            )}

            {currentStep === 'complete' && trainingProgress && (
              <div className="text-center space-y-6 py-12">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-2">Chatbot Created Successfully!</h2>
                  <p className="text-muted-foreground">
                    Your chatbot "{config.name}" is ready to answer questions about your documents.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <Button onClick={handleComplete}>
                    Start Chatting
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/chatbots')}>
                    View All Chatbots
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'upload' || isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep !== 'complete' && (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 'upload' && !canProceedToConfigure()) ||
                  (currentStep === 'configure' && !canProceedToTrain()) ||
                  (currentStep === 'train' && !trainingProgress) ||
                  isSubmitting
                }
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    {currentStep === 'train' ? 'Starting Training...' : 'Processing...'}
                  </>
                ) : currentStep === 'train' ? (
                  'Start Training'
                ) : currentStep === 'complete' ? (
                  'Done'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}