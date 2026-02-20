"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AppIcon } from "@/components/ui/app-icon";
import { FileUploadArea } from "@/components/upload-train/file-upload-area";
import { UrlUploadInput } from "@/components/upload-train/url-upload-input";
import { useCreateProject, useUploadDocument } from "@/lib/api/hooks";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ValidatedFile {
    id: string;
    file: File;
    status: "pending" | "validating" | "ready" | "error";
    validationErrors: string[];
    metadata: {
        name: string;
        size: number;
        type: string;
        detectedType?: string;
    };
}

interface ValidatedUrl {
    id: string;
    url: string;
    status: "pending" | "validating" | "ready" | "error";
    validationErrors: string[];
    metadata?: {
        title?: string;
        contentType?: string;
        size?: number;
        lastModified?: string;
    };
}

export default function NewProjectWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Step 1 State
    const [projectName, setProjectName] = useState("");
    const createProjectMutation = useCreateProject();

    // Step 2 State
    const [files, setFiles] = useState<ValidatedFile[]>([]);
    const [urls, setUrls] = useState<ValidatedUrl[]>([]);
    const uploadDocumentMutation = useUploadDocument();
    const [isUploading, setIsUploading] = useState(false);

    const handleCreateProject = async () => {
        if (!projectName.trim()) {
            toast({ title: "Name required", description: "Please enter a name for your chatbot.", variant: "destructive" });
            return;
        }
        try {
            const res = await createProjectMutation.mutateAsync({ name: projectName.trim() });
            setProjectId(res.id);
            setStep(2);
        } catch (error) {
            // Handled by mutation hook
        }
    };

    const handleUploadSources = async () => {
        const readyFiles = files.filter(f => f.status === "ready");
        const readyUrls = urls.filter(u => u.status === "ready");

        if (readyFiles.length === 0 && readyUrls.length === 0) {
            // Proceed to step 3 without adding sources
            setStep(3);
            return;
        }

        setIsUploading(true);
        let successCount = 0;

        try {
            // Upload files
            for (const f of readyFiles) {
                await uploadDocumentMutation.mutateAsync({
                    projectId: projectId!,
                    file: f.file
                });
                successCount++;
            }

            // Upload URLs
            for (const u of readyUrls) {
                await uploadDocumentMutation.mutateAsync({
                    projectId: projectId!,
                    url: u.url
                });
                successCount++;
            }

            toast({
                title: "Upload complete",
                description: `Successfully processed ${successCount} sources.`
            });
            setStep(3);
        } catch (error) {
            toast({ title: "Upload incomplete", description: "Some sources failed to upload.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <MainLayout>
            <div className="max-w-3xl mx-auto w-full pt-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Wizard Header & Progress */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-6">
                        Create a New Chatbot
                    </h1>
                    <div className="flex items-center justify-center max-w-lg mx-auto relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-border/60 -z-10"></div>

                        <div className="flex justify-between w-full">
                            {/* Step 1 Indicator */}
                            <div className="flex flex-col items-center gap-2 bg-background px-2 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${step >= 1 ? "bg-brand border-brand text-white" : "bg-card border-border text-muted-foreground"}`}>
                                    1
                                </div>
                                <span className={`text-xs font-medium ${step >= 1 ? "text-foreground" : "text-muted-foreground"}`}>Name</span>
                            </div>

                            {/* Step 2 Indicator */}
                            <div className="flex flex-col items-center gap-2 bg-background px-2 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${step >= 2 ? "bg-brand border-brand text-white" : "bg-card border-border text-muted-foreground"}`}>
                                    2
                                </div>
                                <span className={`text-xs font-medium ${step >= 2 ? "text-foreground" : "text-muted-foreground"}`}>Sources</span>
                            </div>

                            {/* Step 3 Indicator */}
                            <div className="flex flex-col items-center gap-2 bg-background px-2 relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${step >= 3 ? "bg-brand border-brand text-white" : "bg-card border-border text-muted-foreground"}`}>
                                    3
                                </div>
                                <span className={`text-xs font-medium ${step >= 3 ? "text-foreground" : "text-muted-foreground"}`}>Launch</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 1: Name & Purpose */}
                {step === 1 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                        <CardContent className="p-8 pt-8 flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6">
                                <AppIcon name="Bot" className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Name your Assistant</h2>
                            <p className="text-muted-foreground text-sm mb-8 max-w-sm">
                                Give your new chatbot a distinct name. You can always change this later.
                            </p>

                            <div className="w-full max-w-md space-y-4">
                                <div className="space-y-2 text-left">
                                    <Input
                                        placeholder="e.g. Employee Support Bot, Product Docs"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateProject(); }}
                                        className="h-12 bg-background text-base"
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    onClick={handleCreateProject}
                                    disabled={createProjectMutation.isPending || !projectName.trim()}
                                    className="w-full h-12 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-all"
                                >
                                    {createProjectMutation.isPending ? "Creating..." : "Create & Continue"}
                                    {!createProjectMutation.isPending && <AppIcon name="ArrowRight" className="ml-2 h-4 w-4" />}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Add Sources */}
                {step === 2 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in slide-in-from-right-8 duration-300">
                        <CardContent className="p-6 sm:p-8 pt-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold mb-1">Add Knowledge Sources</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Upload documents or link web pages to train your chatbot.
                                    </p>
                                </div>
                                <Button variant="ghost" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setStep(3)}>
                                    Skip for now
                                </Button>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50">
                                    <FileUploadArea
                                        files={files}
                                        onFilesChange={setFiles}
                                        disabled={isUploading}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border/60"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">and / or</span>
                                    </div>
                                </div>

                                <div className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50">
                                    <UrlUploadInput
                                        urls={urls}
                                        onUrlsChange={setUrls}
                                        disabled={isUploading}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end items-center gap-4">
                                    <Button
                                        onClick={handleUploadSources}
                                        disabled={isUploading || (files.length === 0 && urls.length === 0)}
                                        className="h-11 px-8 font-medium bg-brand hover:bg-brand-hover text-white transition-all shadow-md hover:shadow-lg"
                                    >
                                        {isUploading ? (
                                            <>
                                                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" />
                                                Processing Sources...
                                            </>
                                        ) : (
                                            <>
                                                Upload & Train
                                                <AppIcon name="Sparkles" className="ml-2 h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Test & Launch */}
                {step === 3 && (
                    <Card className="border-border/60 shadow-sm bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 text-center overflow-hidden">
                        <div className="h-2 bg-success w-full" />
                        <CardContent className="p-8 md:p-12 pt-10 flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-success/20 animate-pulse rounded-full blur-xl scale-150"></div>
                                <div className="h-20 w-20 bg-success/10 text-success rounded-full flex items-center justify-center relative border border-success/20">
                                    <AppIcon name="CheckCircle2" className="h-10 w-10" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold mb-3 tracking-tight text-foreground">
                                Your Chatbot is Ready!
                            </h2>
                            <p className="text-muted-foreground mb-10 max-w-md leading-relaxed text-[15px]">
                                The AI is now trained and ready to answer questions based on the knowledge you provided.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                                <Button asChild variant="outline" className="flex-1 h-12 text-base shadow-sm border-border/60">
                                    <Link href={`/projects`}>
                                        Back to Dashboard
                                    </Link>
                                </Button>
                                <Button asChild className="flex-1 h-12 text-base font-medium shadow-md bg-brand hover:bg-brand-hover text-white">
                                    <Link href={`/projects/${projectId}/chat`}>
                                        <AppIcon name="MessageSquare" className="mr-2 h-4 w-4" />
                                        Test Chatbot Now
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </MainLayout>
    );
}
