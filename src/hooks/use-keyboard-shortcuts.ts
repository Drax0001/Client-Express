"use client";

import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matches =
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey &&
          !!event.metaKey === !!shortcut.metaKey;

        if (matches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Predefined shortcuts for the application
export const useAppKeyboardShortcuts = (
  actions: {
    createProject?: () => void;
    focusSearch?: () => void;
    focusChat?: () => void;
    goToDashboard?: () => void;
    toggleTheme?: () => void;
  } = {}
) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: "n",
      ctrlKey: true,
      action: actions.createProject || (() => {}),
      description: "Create new project",
    },
    {
      key: "k",
      ctrlKey: true,
      action: actions.focusSearch || (() => {}),
      description: "Focus search",
    },
    {
      key: "/",
      action: actions.focusChat || (() => {}),
      description: "Focus chat input",
    },
    {
      key: "h",
      ctrlKey: true,
      action: actions.goToDashboard || (() => {}),
      description: "Go to dashboard",
    },
    {
      key: "t",
      ctrlKey: true,
      action: actions.toggleTheme || (() => {}),
      description: "Toggle theme",
    },
  ].filter((shortcut) => shortcut.action !== (() => {}));

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
};
