"use client";

import React, { useContext, useEffect, useState, useRef } from "react";
import { FaCircle } from "react-icons/fa";
import { IoArrowUpCircleSharp, IoClose } from "react-icons/io5";
import { RiFlowChart } from "react-icons/ri";
import { FaTrash } from "react-icons/fa";
import CollectionSelection from "./components/CollectionSelection";
import { Button } from "@/components/ui/button";
import { TbSettings } from "react-icons/tb";
import { RouterContext } from "../contexts/RouterContext";

interface QueryInputProps {
  handleSendQuery: (
    query: string,
    route?: string,
    mimick?: boolean,
    disable_rag?: boolean
  ) => void;
  query_length: number;
  currentStatus: string;
  addDisplacement: (value: number) => void;
  addDistortion: (value: number) => void;
  selectSettings: () => void;
  defaultRagEnabled?: boolean;
  conversationId?: string | null;
}

const QueryInput: React.FC<QueryInputProps> = ({
  handleSendQuery,
  query_length,
  currentStatus,
  addDisplacement,
  addDistortion,
  selectSettings,
  defaultRagEnabled = false,
  conversationId,
}) => {
  const { prefillPrompt, setPrefillPrompt, autoSendPrefill } = useContext(RouterContext);
  const [query, setQuery] = useState("");

  const [route, setRoute] = useState<string>("");
  const [mimick, setMimick] = useState<boolean>(false);
  const [showRoute, setShowRoute] = useState<boolean>(false);
  // skipRag=true means RAG is disabled, so we invert the logic
  const [skipRag, setSkipRag] = useState<boolean>(!defaultRagEnabled);

  // Track previous conversationId to detect conversation switches
  const prevConversationIdRef = useRef<string | null | undefined>(undefined);
  // Track if user has manually interacted with the toggle in this conversation
  const userHasInteractedRef = useRef<boolean>(false);

  // Sync skipRag with defaultRagEnabled when:
  // 1. Conversation changes (reset interaction flag and sync)
  // 2. defaultRagEnabled changes AND user hasn't manually interacted
  useEffect(() => {
    const conversationChanged = prevConversationIdRef.current !== conversationId;

    if (conversationChanged) {
      // Conversation changed: reset interaction flag and sync
      prevConversationIdRef.current = conversationId;
      userHasInteractedRef.current = false;
      setSkipRag(!defaultRagEnabled);
    } else if (!userHasInteractedRef.current) {
      // Same conversation, but user hasn't interacted yet: sync to defaultRagEnabled
      // This handles the case where data loads after initial render
      setSkipRag(!defaultRagEnabled);
    }
  }, [conversationId, defaultRagEnabled]);

  const triggerQuery = (_query: string) => {
    if (_query.trim() === "" || currentStatus !== "") return;

    handleSendQuery(_query, route, mimick, skipRag);
    setQuery("");
    // Reset interaction flag after submission so toggle syncs to completed query's state
    userHasInteractedRef.current = false;
  };

  // Track user manual interaction with the toggle
  const handleToggleRag = () => {
    userHasInteractedRef.current = true;
    setSkipRag(!skipRag);
  };

  useEffect(() => {
    if (prefillPrompt) {
      if (autoSendPrefill) {
        triggerQuery(prefillPrompt);
      } else {
        setQuery(prefillPrompt);
      }
      setPrefillPrompt("");
    }
  }, [prefillPrompt, setPrefillPrompt, autoSendPrefill]);

  useEffect(() => {
    addDisplacement(0.035);
    addDistortion(0.02);
  }, [query]);

  return (
    <div
      className={`fixed bottom-8 gap-1 flex items-center justify-center flex-col transition-all duration-300 "md:w-[60vw] lg:w-[40vw] w-full p-2 md:p-0 lg:p-0" `}
    >
      <div className="w-full flex justify-between items-center gap-2 mb-2">
        {currentStatus != "" ? (
          <div className="flex gap-2 items-center">
            <FaCircle className="text-lg pulsing" />
            <p className="text-sm shine">{currentStatus}</p>
          </div>
        ) : (
          <div></div>
        )}
      </div>
      {showRoute && (
        <div className="w-full flex gap-2 bg-background_alt rounded-xl p-2 fade-in justify-between">
          <input
            className="flex-grow p-2 bg-transparent outline-none text-xs resize-none"
            value={route}
            placeholder="Enter a route: e.g. search/query/text_response"
            onChange={(e) => setRoute(e.target.value)}
          />
          <div className="flex gap-2">
            {mimick ? (
              <button
                className="btn text-accent"
                onClick={() => setMimick(false)}
              >
                <p className="text-xs">Disable Mimicking</p>
              </button>
            ) : (
              <button
                className="btn text-secondary"
                onClick={() => setMimick(true)}
              >
                <p className="text-xs">Enable Mimicking</p>
              </button>
            )}
            <button
              className="btn-round text-secondary rounded-full"
              onClick={() => setRoute("")}
            >
              <FaTrash size={12} />
            </button>
            <button
              className="btn-round text-secondary rounded-full"
              onClick={() => setShowRoute(false)}
            >
              <IoClose size={12} />
            </button>
          </div>
        </div>
      )}
      <div
        className={`w-full flex gap-2 rounded-xl text-primary placeholder:text-secondary`}
      >
        <div
          className={`flex w-full bg-background_alt border border-foreground_alt p-2 rounded-xl items-center flex-col`}
        >
          <textarea
            placeholder={
              query_length != 0
                ? "Ask a follow up question..."
                : "What will you ask today?"
            }
            className={`w-full p-2 bg-transparent placeholder:text-secondary outline-none text-sm leading-tight min-h-[5vh] max-h-[10vh] rounded-xl flex items-center justify-center"
            }`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                triggerQuery(query);
              }
            }}
            style={{
              paddingTop: query_length === 0 ? "8px" : "6px",
              display: "flex",
              alignItems: "center",
              resize: "none",
            }}
          />
          <div className="flex justify-end gap-1 w-full">
            <Button
              variant="ghost"
              size={"sm"}
              className={`${!skipRag ? "text-accent font-bold" : "text-secondary opacity-50"}`}
              onClick={handleToggleRag}
              title={
                !skipRag ? "RAG Enabled" : "RAG Disabled (Direct Answer)"
              }
            >
              RAG
            </Button>
            {process.env.NODE_ENV === "development" && (
              <Button
                variant="ghost"
                size={"icon"}
                className={`${showRoute && !route
                  ? "text-primary"
                  : route
                    ? "text-accent"
                    : "text-secondary"
                  }`}
                onClick={() => setShowRoute(!showRoute)}
              >
                <RiFlowChart size={16} />
              </Button>
            )}
            {query_length > 0 && (
              <Button
                variant="ghost"
                size={"icon"}
                onClick={() => selectSettings()}
              >
                <TbSettings size={16} />
              </Button>
            )}
            {!skipRag && <CollectionSelection />}
            <Button
              variant="ghost"
              size={"icon"}
              onClick={() => triggerQuery(query)}
            >
              <IoArrowUpCircleSharp size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryInput;
