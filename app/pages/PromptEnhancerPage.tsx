"use client";

import React, { useContext, useState, useCallback } from "react";
import { RouterContext } from "@/app/components/contexts/RouterContext";
import { SessionContext } from "@/app/components/contexts/SessionContext";
import { ConversationContext } from "@/app/components/contexts/ConversationContext";
import { Button } from "@/components/ui/button";
import { enhancePrompt } from "@/app/api/enhancePrompt";
import {
  MdAutoFixHigh,
  MdCleaningServices,
  MdArrowBack,
  MdSend,
  MdNavigateBefore,
  MdNavigateNext,
} from "react-icons/md";

export default function PromptEnhancerPage() {
  const { changePage, setPrefillPrompt } = useContext(RouterContext);
  const { id: userId } = useContext(SessionContext);
  const { currentConversation } = useContext(ConversationContext);

  const [upperText, setUpperText] = useState("");
  const [lowerText, setLowerText] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  const handleMigliora = useCallback(async () => {
    if (isLoading || !lowerText.trim()) return;

    setIsLoading(true);
    try {
      const result = await enhancePrompt(
        userId || "",
        currentConversation || "",
        upperText || null,
        lowerText
      );

      if (result.error) {
        setLowerText(`Errore: ${result.error}`);
      } else if (result.feedback) {
        setLowerText(result.feedback);
      } else if (result.enhanced_prompt) {
        setUpperText(result.enhanced_prompt);
        setLowerText("");
        const newHistory = [...history.slice(0, historyIndex + 1), result.enhanced_prompt];
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    } catch {
      setLowerText("Errore di connessione con il server.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, lowerText, upperText, userId, currentConversation, history, historyIndex]);

  const handleUsa = useCallback(() => {
    if (!upperText.trim()) return;
    setPrefillPrompt(upperText, true);
    changePage("chat", {}, true);
  }, [upperText, setPrefillPrompt, changePage]);

  const handleAbbandona = useCallback(() => {
    changePage("chat", {}, true);
  }, [changePage]);

  const handlePulisci = useCallback(() => {
    setUpperText("");
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const handleUpperTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setUpperText(newText);
      if (historyIndex >= 0 && historyIndex < history.length) {
        setHistory((prev) => {
          const updated = [...prev];
          updated[historyIndex] = newText;
          return updated;
        });
      }
    },
    [historyIndex, history.length]
  );

  const handleHistoryPrev = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setUpperText(history[newIndex]);
    }
  }, [historyIndex, history]);

  const handleHistoryNext = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setUpperText(history[newIndex]);
    }
  }, [historyIndex, history]);

  return (
    <div
      className="flex flex-col w-full self-stretch gap-3 fade-in"
      style={{ height: "calc(100vh - 6rem)" }}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center gap-2 shrink-0">
        <MdAutoFixHigh className="text-xl text-primary" />
        <p className="text-primary text-xl font-heading font-bold">
          Prompt Enhancer
        </p>
      </div>

      {/* Upper section — enhanced prompt (fills all available height) */}
      <div className="flex flex-col flex-1 min-h-0 w-full">
        <div className="flex justify-between items-center mb-2">
          <Button
            size="sm"
            className="text-primary"
            onClick={handleUsa}
            disabled={!upperText.trim()}
          >
            <MdSend className="mr-1" />
            Usa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePulisci}
            disabled={!upperText && history.length === 0}
          >
            <MdCleaningServices className="mr-1" />
            Pulisci
          </Button>
        </div>
        <textarea
          className="flex-1 w-full resize-none bg-background_alt border border-foreground_alt rounded-xl p-4 text-primary text-sm outline-none placeholder:text-secondary leading-relaxed"
          value={upperText}
          onChange={handleUpperTextChange}
          placeholder="Il prompt migliorato apparirà qui..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleUsa();
            }
          }}
        />
        {history.length >= 2 && (
          <div className="flex justify-center items-center gap-3 mt-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleHistoryPrev}
              disabled={historyIndex <= 0}
            >
              <MdNavigateBefore size={20} />
            </Button>
            <span className="text-sm text-secondary tabular-nums">
              {historyIndex + 1} / {history.length}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleHistoryNext}
              disabled={historyIndex >= history.length - 1}
            >
              <MdNavigateNext size={20} />
            </Button>
          </div>
        )}
      </div>

      {/* Lower section — suggestion/raw prompt (anchored to bottom) */}
      <div className="flex flex-col shrink-0 w-full h-[200px]">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-primary"
              onClick={handleMigliora}
              disabled={!lowerText.trim() || isLoading}
            >
              <MdAutoFixHigh className="mr-1" />
              {isLoading ? "Elaborazione..." : "Migliora"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAbbandona}
            >
              <MdArrowBack className="mr-1" />
              Abbandona
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLowerText("")}
            disabled={!lowerText}
          >
            <MdCleaningServices className="mr-1" />
            Pulisci
          </Button>
        </div>
        <textarea
          className="flex-1 w-full resize-none bg-background_alt border border-foreground_alt rounded-xl p-4 text-primary text-sm outline-none placeholder:text-secondary leading-relaxed"
          value={lowerText}
          onChange={(e) => setLowerText(e.target.value)}
          placeholder="Scrivi qui il tuo prompt o i suggerimenti di modifica..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleMigliora();
            }
          }}
        />
      </div>
    </div>
  );
}
