import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IoCheckmarkOutline } from "react-icons/io5";
import { MdContentCopy } from "react-icons/md";

interface CopyToClipboardProps {
  copyText: string;
}

const CopyToClipboardButton: React.FC<CopyToClipboardProps> = ({
  copyText,
}) => {
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch (err) {
      // Fallback for non-secure contexts (HTTP non-localhost)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = copyText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopied(true);
      } catch (fallbackErr) {
        console.error("Failed to copy text:", fallbackErr);
      }
    }
  };

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copied]);

  return (
    <Button
      onClick={handleCopy}
      variant="ghost"
      className={`${copied ? "text-accent" : "text-secondary"} h-9 w-9`}
      title="Copy to clipboard"
    >
      {copied ? <IoCheckmarkOutline size={14} /> : <MdContentCopy size={14} />}
    </Button>
  );
};

export default CopyToClipboardButton;
