"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Keyboard } from "lucide-react"

interface KeyboardShortcut {
  keys: string[]
  description: string
}

const shortcuts: KeyboardShortcut[] = [
  { keys: ["Ctrl", "N"], description: "Create new project" },
  { keys: ["Ctrl", "K"], description: "Focus search" },
  { keys: ["/"], description: "Focus chat input" },
  { keys: ["Ctrl", "H"], description: "Go to dashboard" },
  { keys: ["Enter"], description: "Send message (in chat)" },
  { keys: ["Shift", "Enter"], description: "New line (in chat)" },
  { keys: ["Escape"], description: "Close dialogs" },
]

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Keyboard className="h-4 w-4" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these keyboard shortcuts to navigate faster through the application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    <Badge variant="outline" className="text-xs px-2 py-1">
                      {key}
                    </Badge>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="text-muted-foreground">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}