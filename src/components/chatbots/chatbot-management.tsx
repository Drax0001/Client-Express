"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Chatbot {
  id: string;
  name: string;
  description?: string;
  status: "ready" | "training" | "failed" | "error";
  documentCount: number;
  queryCount: number;
  totalTokens: number;
  lastQueriedAt?: string;
  createdAt: string;
  statistics: {
    completedTrainings: number;
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    lastActivity?: string;
  };
}

interface ChatbotManagementProps {
  chatbots: Chatbot[];
  loading?: boolean;
  onSearch?: (query: string) => void;
  onFilter?: (filters: ChatbotFilters) => void;
  onEdit?: (chatbotId: string) => void;
  onDelete?: (chatbotId: string) => void;
  onChat?: (chatbotId: string) => void;
  onViewStats?: (chatbotId: string) => void;
  className?: string;
}

interface ChatbotFilters {
  status?: string;
  sortBy?: "name" | "createdAt" | "lastActivity" | "queryCount";
  sortOrder?: "asc" | "desc";
}

const STATUS_CONFIG = {
  ready: {
    label: "Ready",
    color: "text-green-700 bg-green-100",
    iconName: "CheckCircle",
  },
  training: {
    label: "Training",
    color: "text-blue-700 bg-blue-100",
    iconName: "Loader2",
  },
  failed: {
    label: "Failed",
    color: "text-red-700 bg-red-100",
    iconName: "XCircle",
  },
  error: {
    label: "Error",
    color: "text-orange-700 bg-orange-100",
    iconName: "XCircle",
  },
};

export function ChatbotManagement({
  chatbots,
  loading = false,
  onSearch,
  onFilter,
  onEdit,
  onDelete,
  onChat,
  onViewStats,
  className,
}: ChatbotManagementProps) {
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filters, setFilters] = React.useState<ChatbotFilters>({
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleFilterChange = (newFilters: Partial<ChatbotFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilter?.(updatedFilters);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return formatDate(dateString);
  };

  const ChatbotCard = ({ chatbot }: { chatbot: Chatbot }) => {
    const statusConfig = STATUS_CONFIG[chatbot.status];

    if (viewMode === "grid") {
      return (
        <Card className="group hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {chatbot.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {chatbot.name}
                  </CardTitle>
                  {chatbot.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {chatbot.description}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AppIcon name="MoreHorizontal" className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onChat?.(chatbot.id)}>
                    <AppIcon name="MessageCircle" className="h-4 w-4 mr-2" />
                    Start Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onViewStats?.(chatbot.id)}>
                    <AppIcon name="BarChart3" className="h-4 w-4 mr-2" />
                    View Statistics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(chatbot.id)}>
                    <AppIcon name="Edit" className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete?.(chatbot.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <AppIcon name="Trash2" className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                className={cn("flex items-center gap-1", statusConfig.color)}
              >
                <AppIcon
                  name={(statusConfig as any).iconName}
                  className="h-3 w-3"
                />
                {statusConfig.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {chatbot.documentCount} documents
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <AppIcon name="MessageCircle" className="h-3 w-3" />
                  <span>Queries</span>
                </div>
                <div className="font-medium">
                  {chatbot.queryCount.toLocaleString()}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <AppIcon name="FileText" className="h-3 w-3" />
                  <span>Conversations</span>
                </div>
                <div className="font-medium">
                  {chatbot.statistics.totalConversations}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Created {formatDate(chatbot.createdAt)}</span>
              <span>
                Last active{" "}
                {formatLastActivity(chatbot.statistics.lastActivity)}
              </span>
            </div>
          </CardContent>
        </Card>
      );
    }

    // List view
    return (
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary">
                {chatbot.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <div className="font-medium">{chatbot.name}</div>
                {chatbot.description && (
                  <div className="text-sm text-muted-foreground truncate">
                    {chatbot.description}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <Badge
                  className={cn(
                    "flex items-center gap-1 w-fit",
                    statusConfig.color,
                  )}
                >
                  <AppIcon
                    name={(statusConfig as any).iconName}
                    className="h-3 w-3"
                  />
                  {statusConfig.label}
                </Badge>
              </div>

              <div className="col-span-1 text-center">
                <div className="text-sm font-medium">
                  {chatbot.documentCount}
                </div>
                <div className="text-xs text-muted-foreground">docs</div>
              </div>

              <div className="col-span-1 text-center">
                <div className="text-sm font-medium">{chatbot.queryCount}</div>
                <div className="text-xs text-muted-foreground">queries</div>
              </div>

              <div className="col-span-1 text-center">
                <div className="text-sm font-medium">
                  {chatbot.statistics.totalConversations}
                </div>
                <div className="text-xs text-muted-foreground">convs</div>
              </div>

              <div className="col-span-2 text-center">
                <div className="text-sm font-medium">
                  {formatLastActivity(chatbot.statistics.lastActivity)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(chatbot.createdAt)}
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChat?.(chatbot.id)}
                  className="h-8 w-8 p-0"
                >
                  <AppIcon name="MessageCircle" className="h-4 w-4" />
                  <span className="sr-only">Chat</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewStats?.(chatbot.id)}
                  className="h-8 w-8 p-0"
                >
                  <AppIcon name="BarChart3" className="h-4 w-4" />
                  <span className="sr-only">Statistics</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <AppIcon name="MoreHorizontal" className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(chatbot.id)}>
                      <AppIcon name="Edit" className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(chatbot.id)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <AppIcon name="Trash2" className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const ChatbotSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-16" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chatbots</h2>
          <p className="text-muted-foreground">
            Manage your AI chatbots and view their performance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <AppIcon name="Grid3X3" className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <AppIcon name="List" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <AppIcon
              name="Search"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            />
            <Input
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            handleFilterChange({
              status: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split("-");
            handleFilterChange({
              sortBy: sortBy as any,
              sortOrder: sortOrder as any,
            });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt-desc">Newest First</SelectItem>
            <SelectItem value="createdAt-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="lastActivity-desc">Recently Active</SelectItem>
            <SelectItem value="queryCount-desc">Most Used</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chatbots Grid/List */}
      {loading ? (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4",
          )}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <ChatbotSkeleton key={i} />
          ))}
        </div>
      ) : chatbots.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <AppIcon
              name="MessageCircle"
              className="h-12 w-12 mx-auto mb-4 opacity-50"
            />
            <h3 className="text-lg font-medium mb-2">No chatbots found</h3>
            <p className="text-sm">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Create your first chatbot to get started"}
            </p>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4",
          )}
        >
          {chatbots.map((chatbot) => (
            <ChatbotCard key={chatbot.id} chatbot={chatbot} />
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {!loading && chatbots.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
          <span>
            Showing {chatbots.length} chatbot{chatbots.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {chatbots.filter((c) => c.status === "ready").length} ready
            </span>
            <span>
              {chatbots.filter((c) => c.status === "training").length} training
            </span>
            <span>
              Total queries:{" "}
              {chatbots
                .reduce((sum, c) => sum + c.queryCount, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
