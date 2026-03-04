"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface TrainingProgress {
  trainingId: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  currentStep:
  | "uploading"
  | "extracting"
  | "chunking"
  | "embedding"
  | "storing"
  | string;
  progress: number; // 0-100
  currentFile?: string;
  errors: string[];
  estimatedTimeRemaining?: number; // in seconds
  startedAt?: Date;
  completedAt?: Date;
}

interface TrainingProgressProps {
  progress: TrainingProgress;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

const STEP_CONFIG = {
  uploading: {
    label: "Uploading Files",
    description: "Preparing documents for processing",
    iconName: "Upload",
    color: "text-blue-500",
  },
  extracting: {
    label: "Extracting Text",
    description: "Reading content from documents",
    iconName: "FileText",
    color: "text-orange-500",
  },
  chunking: {
    label: "Processing Chunks",
    description: "Splitting documents into manageable pieces",
    iconName: "Split",
    color: "text-purple-500",
  },
  embedding: {
    label: "Generating Embeddings",
    description: "Creating vector representations",
    iconName: "Cpu",
    color: "text-green-500",
  },
  storing: {
    label: "Storing Vectors",
    description: "Saving to knowledge base",
    iconName: "Database",
    color: "text-indigo-500",
  },
};

const STATUS_CONFIG = {
  queued: {
    label: "Queued",
    description: "Waiting to start training",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconName: "Clock",
  },
  processing: {
    label: "Training",
    description: "Processing your documents",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconName: "Loader2",
  },
  completed: {
    label: "Completed",
    description: "Training finished successfully",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconName: "CheckCircle",
  },
  failed: {
    label: "Failed",
    description: "Training encountered errors",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconName: "AlertCircle",
  },
  cancelled: {
    label: "Cancelled",
    description: "Training was stopped",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    iconName: "X",
  },
};

export function TrainingProgress({
  progress,
  onCancel,
  onRetry,
  className,
}: TrainingProgressProps) {
  const statusConfig = STATUS_CONFIG[progress.status];
  const stepConfig =
    STEP_CONFIG[progress.currentStep as keyof typeof STEP_CONFIG];

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const duration = Math.floor((endTime.getTime() - start.getTime()) / 1000);
    return formatTime(duration);
  };

  const getStepProgress = (): { completed: number; total: number } => {
    const steps = Object.keys(STEP_CONFIG);
    const currentIndex = steps.indexOf(progress.currentStep);
    const completed = Math.max(0, currentIndex);
    return { completed, total: steps.length };
  };

  const { completed: completedSteps, total: totalSteps } = getStepProgress();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-full",
                  statusConfig.bgColor,
                  statusConfig.borderColor,
                  "border",
                )}
              >
                <AppIcon
                  name={statusConfig.iconName as string}
                  className={cn("h-5 w-5", statusConfig.color)}
                />
              </div>
              <div>
                <CardTitle className="text-lg">{statusConfig.label}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {statusConfig.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {progress.status === "processing" && onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                  className="text-red-600 hover:text-red-700"
                >
                  <AppIcon name="X" className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}

              {progress.status === "failed" && onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <AppIcon name="RefreshCw" className="h-4 w-4 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* Time Information */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {progress.startedAt && (
                <span>Started: {progress.startedAt.toLocaleTimeString()}</span>
              )}
              {progress.status === "processing" &&
                progress.estimatedTimeRemaining && (
                  <span>
                    ~{formatTime(progress.estimatedTimeRemaining)} remaining
                  </span>
                )}
              {progress.completedAt && progress.startedAt && (
                <span>
                  Duration:{" "}
                  {formatDuration(progress.startedAt, progress.completedAt)}
                </span>
              )}
            </div>
            <Badge variant="outline">{progress.trainingId.slice(-8)}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      {progress.status === "processing" && stepConfig && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AppIcon
                name={(stepConfig as any).iconName}
                className={cn("h-4 w-4", stepConfig.color)}
              />
              {stepConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {stepConfig.description}
            </p>

            {progress.currentFile && (
              <div className="flex items-center gap-2 text-sm">
                <AppIcon
                  name="FileText"
                  className="h-4 w-4 text-muted-foreground"
                />
                <span className="truncate">{progress.currentFile}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Progress */}
      {progress.status === "processing" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Training Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(STEP_CONFIG).map(([stepKey, step], index) => {
                const isCompleted = index < completedSteps;
                const isCurrent = stepKey === progress.currentStep;
                const isPending = index > completedSteps;

                return (
                  <div key={stepKey} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2",
                        isCompleted &&
                        "bg-green-500 border-green-500 text-white",
                        isCurrent && "border-blue-500 text-blue-500",
                        isPending && "border-gray-300 text-gray-400",
                      )}
                    >
                      {isCompleted ? (
                        <AppIcon name="CheckCircle" className="h-4 w-4" />
                      ) : isCurrent ? (
                        <AppIcon
                          name={(step as any).iconName}
                          className="h-4 w-4"
                        />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          isCompleted && "text-green-700",
                          isCurrent && "text-blue-700",
                          isPending && "text-gray-500",
                        )}
                      >
                        {step.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Step {completedSteps + 1} of {totalSteps}
                </span>
                <Badge variant="secondary">
                  {Math.round(
                    ((completedSteps + progress.progress / 100) / totalSteps) *
                    100,
                  )}
                  % complete
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {progress.errors.length > 0 && (
        <Alert variant="destructive">
          <AppIcon name="AlertCircle" className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Training encountered the following errors:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {progress.errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Completion Message */}
      {progress.status === "completed" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AppIcon name="CheckCircle" className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-green-800">
                  Training Complete!
                </h3>
                <p className="text-sm text-green-700">
                  Your chatbot is ready to answer questions based on the
                  uploaded documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
