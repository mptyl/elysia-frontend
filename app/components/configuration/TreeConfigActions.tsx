"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { FaSave } from "react-icons/fa";
import { TbArrowBackUp } from "react-icons/tb";

interface TreeConfigActionsProps {
  changedConfig: boolean;
  onSaveConfig: () => void;
  onCancelConfig: () => void;
  onBack: () => void;
}

/**
 * Component for tree configuration actions (save, cancel, reset, back)
 * Specialized for tree settings with unique actions like reset and back to chat
 */
export default function TreeConfigActions({
  changedConfig,
  onSaveConfig,
  onCancelConfig,
  onBack,
}: TreeConfigActionsProps) {
  const t = useTranslations("config");
  const tc = useTranslations("common");

  return (
    <>
      {/* Header with title and modified indicator */}
      <div className="flex items-center gap-2">
        <h2 className="text-primary">{t('chatConfiguration')}</h2>
        {changedConfig && (
          <div className="flex flex-row fade-in items-center gap-2 bg-highlight text-primary-foreground rounded-md px-2 py-1">
            <p className="text-xs text-background">{t('modified')}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-row items-center gap-3">
        <motion.div
          animate={
            changedConfig
              ? { rotate: [-2, 2, -2, 2, 0], y: [0, -4, 0, -4, 0] }
              : {}
          }
          transition={{
            duration: 0.5,
            repeat: changedConfig ? Infinity : 0,
            repeatDelay: 1,
            ease: "easeInOut",
          }}
        >
          <Button
            disabled={!changedConfig}
            className="bg-accent text-primary"
            onClick={onSaveConfig}
          >
            <FaSave />
            {tc('save')}
          </Button>
        </motion.div>

        <Button
          variant="destructive"
          onClick={onCancelConfig}
          disabled={!changedConfig}
        >
          {tc('cancel')}
        </Button>

        <Button variant="outline" onClick={onBack}>
          <TbArrowBackUp size={16} />
          {tc('back')}
        </Button>
      </div>
    </>
  );
}
