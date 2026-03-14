"use client";

import * as React from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Module {
    name: string;
    description: string;
}

interface ModuleSelectorProps {
    modules: Module[];
    onSelect: (module: Module) => void;
    className?: string;
}

export function ModuleSelector({ modules, onSelect, className }: ModuleSelectorProps) {
    const [selected, setSelected] = React.useState<Module | null>(null);
    const [confirming, setConfirming] = React.useState(false);

    if (!modules || modules.length === 0) return null;

    const handleSelect = (mod: Module) => {
        setSelected(mod);
        setConfirming(true);

        // Brief confirmation animation before calling onSelect
        setTimeout(() => {
            onSelect(mod);
        }, 800);
    };

    return (
        <div className={cn("flex flex-col items-center justify-center p-6 space-y-6", className)}>
            <div className="text-center space-y-2">
                <div className="h-14 w-14 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
                    <AppIcon name="LayoutGrid" className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Choose a Topic</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                    Select a topic to get started. This helps the assistant focus on the most relevant information for you.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {modules.map((mod) => {
                    const isSelected = selected?.name === mod.name;
                    return (
                        <Card
                            key={mod.name}
                            className={cn(
                                "cursor-pointer transition-all group relative overflow-hidden",
                                isSelected
                                    ? "border-brand shadow-lg ring-2 ring-brand/30 scale-[1.02]"
                                    : "border-border/60 hover:border-brand/50 hover:shadow-md",
                                confirming && !isSelected && "opacity-40 pointer-events-none",
                            )}
                            onClick={() => !confirming && handleSelect(mod)}
                        >
                            <CardContent className="p-4 flex items-start gap-3">
                                <div className={cn(
                                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                    isSelected
                                        ? "bg-brand text-white"
                                        : "bg-brand/10 text-brand group-hover:bg-brand/20",
                                )}>
                                    {isSelected ? (
                                        <AppIcon name="Check" className="h-4 w-4" />
                                    ) : (
                                        <AppIcon name="MessageCircle" className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-sm text-foreground">{mod.name}</p>
                                        {isSelected && (
                                            <Badge variant="default" className="bg-brand text-white text-[10px] px-1.5 py-0 animate-in fade-in zoom-in-50 duration-300">
                                                Selected
                                            </Badge>
                                        )}
                                    </div>
                                    {mod.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {mod.description}
                                        </p>
                                    )}
                                </div>
                            </CardContent>

                            {/* Selection ripple effect */}
                            {isSelected && (
                                <div className="absolute inset-0 bg-brand/5 animate-in fade-in duration-300 pointer-events-none" />
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Confirmation message */}
            {confirming && selected && (
                <div className="flex items-center gap-2 text-brand font-medium text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AppIcon name="Loader2" className="h-4 w-4 animate-spin-slow" />
                    Starting conversation about <span className="font-semibold">{selected.name}</span>...
                </div>
            )}
        </div>
    );
}
