"use client";

import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="p-6">
          <CardTitle>Uploads</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <AppIcon name="Info" className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <div className="font-medium">This page is coming back later</div>
              <div className="text-sm text-muted-foreground">
                Upload and training from the standalone wizard is currently disabled.
                Use project ingestion instead.
              </div>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
