import React, { useContext, useRef, useState } from "react";
import { ResultPayload } from "@/app/types/chat";
import RenderDisplay from "./RenderDisplay";
import MergedDisplayTabs from "./components/MergedDisplayTabs";
import { Eye, EyeOff } from "lucide-react";
import { ConversationContext } from "../contexts/ConversationContext";

interface MergeDisplaysProps {
  payloadsToMerge: ResultPayload[];
  baseKey: string;
  messageId: string;
  handleResultPayloadChange: (
    type: string,
    payload: /* eslint-disable @typescript-eslint/no-explicit-any */ any,
    collection_name: string
  ) => void;
}

const MergeDisplays: React.FC<MergeDisplaysProps> = ({
  payloadsToMerge,
  baseKey,
  messageId,
  handleResultPayloadChange,
}) => {
  const [activeTab, setActiveTab] = useState(`${baseKey}-tab-0`);
  const { chunksVisible, setChunksVisible } = useContext(ConversationContext);
  const contentRef = useRef<HTMLDivElement>(null);

  if (!payloadsToMerge || payloadsToMerge.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-2 mb-1 w-full">
        <div className="flex overflow-x-auto gap-2 flex-nowrap scrollbar-thin scrollbar-thumb-foreground scrollbar-track-background_alt">
          {payloadsToMerge.map((payload, idx) => {
            const tabValue = `${baseKey}-tab-${idx}`;
            const tabTitle =
              payload.metadata?.collection_name || `Collection ${idx + 1}`;
            return (
              <MergedDisplayTabs
                key={`${baseKey}-tab-${idx}`}
                baseKey={baseKey}
                tabValue={tabValue}
                idx={idx}
                tabTitle={tabTitle}
                setActiveTab={setActiveTab}
                activeTab={activeTab}
              />
            );
          })}
        </div>
        <button
          onClick={() => setChunksVisible(!chunksVisible)}
          className="ml-auto flex-shrink-0 p-1 text-secondary hover:text-primary transition-colors duration-200"
          title={chunksVisible ? "Hide chunks" : "Show chunks"}
        >
          {chunksVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: chunksVisible ? contentRef.current?.scrollHeight ?? 1000 : 0,
          opacity: chunksVisible ? 1 : 0,
        }}
      >
        <div className="mt-2 flex flex-col gap-4">
          {payloadsToMerge.map((payload, idx) => {
            const tabValue = `${baseKey}-tab-${idx}`;
            if (activeTab !== tabValue) return null;

            return (
              <div key={`${baseKey}-content-${idx}`}>
                <RenderDisplay
                  payload={payload}
                  index={idx}
                  handleResultPayloadChange={handleResultPayloadChange}
                  messageId={messageId}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MergeDisplays;
