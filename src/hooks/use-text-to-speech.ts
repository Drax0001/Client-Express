"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseTextToSpeechOptions {
    /** Speech rate (0.5 – 2, default 1) */
    rate?: number;
    /** Pitch (0 – 2, default 1) */
    pitch?: number;
}

interface UseTextToSpeechReturn {
    speak: (text: string) => void;
    stop: () => void;
    isSpeaking: boolean;
    /** ID of the message currently being spoken */
    speakingMessageId: string | null;
    speakMessage: (messageId: string, text: string) => void;
    isSupported: boolean;
}

/**
 * Strip markdown formatting so the TTS engine reads clean text.
 */
function stripMarkdown(md: string): string {
    return md
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
        .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, "$2")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/^[\s]*[-*+]\s+/gm, "")
        .replace(/^[\s]*\d+\.\s+/gm, "")
        .replace(/^[-*_]{3,}$/gm, "")
        .replace(/^>\s+/gm, "")
        .replace(/\n{2,}/g, ". ")
        .replace(/\n/g, " ")
        .trim();
}

/**
 * Simple heuristic to detect if text is French.
 * Checks for common French words/patterns.
 */
function detectLanguage(text: string): string {
    const lower = text.toLowerCase();
    const frenchWords = [
        " le ", " la ", " les ", " des ", " une ", " est ", " sont ",
        " dans ", " pour ", " avec ", " qui ", " que ", " sur ",
        " pas ", " vous ", " nous ", " cette ", " ces ", " mais ",
        " aussi ", " très ", " être ", " avoir ", " faire ",
        "c'est", "n'est", "l'", "d'", "j'", "qu'",
    ];
    const frenchCount = frenchWords.filter((w) => lower.includes(w)).length;
    return frenchCount >= 3 ? "fr-FR" : "en-US";
}

export function useTextToSpeech(
    options: UseTextToSpeechOptions = {},
): UseTextToSpeechReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
        null,
    );
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isSupported =
        typeof window !== "undefined" && "speechSynthesis" in window;

    // Cancel on unmount
    useEffect(() => {
        return () => {
            if (isSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [isSupported]);

    const speak = useCallback(
        (text: string) => {
            if (!isSupported) return;

            // Stop any current speech
            window.speechSynthesis.cancel();

            const cleanText = stripMarkdown(text);
            if (!cleanText) return;

            // Auto-detect language from text content
            const detectedLang = detectLanguage(cleanText);

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = detectedLang;
            utterance.rate = options.rate ?? 1;
            utterance.pitch = options.pitch ?? 1;

            // Try to find a matching voice for the detected language
            const voices = window.speechSynthesis.getVoices();
            const langPrefix = detectedLang.split("-")[0];
            const matchingVoice = voices.find(
                (v) =>
                    v.lang.startsWith(langPrefix) &&
                    (v.localService || v.name.toLowerCase().includes("google")),
            );
            if (matchingVoice) {
                utterance.voice = matchingVoice;
            }

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => {
                setIsSpeaking(false);
                setSpeakingMessageId(null);
            };
            utterance.onerror = () => {
                setIsSpeaking(false);
                setSpeakingMessageId(null);
            };

            utteranceRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        },
        [isSupported, options.rate, options.pitch],
    );

    const speakMessage = useCallback(
        (messageId: string, text: string) => {
            // If already speaking this message, stop
            if (speakingMessageId === messageId && isSpeaking) {
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
                setSpeakingMessageId(null);
                return;
            }

            setSpeakingMessageId(messageId);
            speak(text);
        },
        [speak, speakingMessageId, isSpeaking],
    );

    const stop = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setSpeakingMessageId(null);
        }
    }, [isSupported]);

    return {
        speak,
        stop,
        isSpeaking,
        speakingMessageId,
        speakMessage,
        isSupported,
    };
}

