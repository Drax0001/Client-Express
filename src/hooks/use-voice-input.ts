"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceInputOptions {
  /** Called with interim/final transcript while listening */
  onTranscript?: (text: string) => void;
  /** Called when recognition ends (final transcript) */
  onEnd?: (finalText: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
}

// Extend window for vendor-prefixed API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

function getSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {},
): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isSupported = typeof window !== "undefined" && getSpeechRecognition() !== null;

  // Keep callbacks in refs to avoid re-creating recognition
  const onTranscriptRef = useRef(options.onTranscript);
  const onEndRef = useRef(options.onEnd);
  useEffect(() => {
    onTranscriptRef.current = options.onTranscript;
  }, [options.onTranscript]);
  useEffect(() => {
    onEndRef.current = options.onEnd;
  }, [options.onEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const start = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    if (!SpeechRecognitionClass) return;

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionClass();
    // Auto-detect language — use browser's default locale
    // Empty string or navigator.language allows the browser to detect any language
    recognition.lang = "";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }

      const combined = (finalTranscript + interim).trim();
      setTranscript(combined);
      onTranscriptRef.current?.(combined);
    };

    recognition.onerror = (event: any) => {
      // "no-speech" and "aborted" are normal, not real errors
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      const final = finalTranscript.trim();
      if (final) {
        onEndRef.current?.(final);
      }
    };

    recognitionRef.current = recognition;
    setTranscript("");
    setIsListening(true);

    try {
      recognition.start();
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    start,
    stop,
  };
}

