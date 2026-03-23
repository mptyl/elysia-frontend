"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { RiRobot2Line } from "react-icons/ri";
import { SiDocsify } from "react-icons/si";
import {
  SettingCard,
  SettingHeader,
  SettingGroup,
  SettingItem,
  SettingTitle,
} from "../SettingComponents";
import SettingTextarea from "../SettingTextarea";
import SettingCheckbox from "../SettingCheckbox";
import { BackendConfig } from "@/app/types/objects";

interface AgentSectionProps {
  currentUserConfig: BackendConfig | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateFields: (key: string, value: any) => void;
  onUpdateSettings: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyOrUpdates: string | Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value?: any
  ) => void;
  title?: string; // Optional title override
  showDocumentation?: boolean; // Option to hide documentation button
  showFeedbackSetting?: boolean; // Option to show/hide feedback setting
}

/**
 * Component for configuring AI agent settings
 * Handles agent description, end goal, style, and feedback options
 */
export default function AgentSection({
  currentUserConfig,
  onUpdateFields,
  onUpdateSettings,
  title,
  showDocumentation = true,
  showFeedbackSetting = true,
}: AgentSectionProps) {
  const t = useTranslations("config");
  const resolvedTitle = title ?? t('agent');

  return (
    <SettingCard>
      <SettingHeader
        icon={<RiRobot2Line />}
        className="bg-highlight"
        header={resolvedTitle}
        buttonIcon={showDocumentation ? <SiDocsify /> : undefined}
        buttonText={showDocumentation ? t('documentation') : undefined}
        onClick={
          showDocumentation
            ? () => {
                window.open("https://weaviate.github.io/elysia/", "_blank");
              }
            : undefined
        }
      />

      <SettingGroup>
        <SettingItem>
          <SettingTitle
            title={t('description')}
            description={t('descriptionDesc')}
          />
          <SettingTextarea
            value={currentUserConfig?.agent_description || ""}
            onChange={(value) => {
              onUpdateFields("agent_description", value);
            }}
          />
        </SettingItem>

        <SettingItem>
          <SettingTitle
            title={t('endGoal')}
            description={t('endGoalDesc')}
          />
          <SettingTextarea
            value={currentUserConfig?.end_goal || ""}
            onChange={(value) => {
              onUpdateFields("end_goal", value);
            }}
          />
        </SettingItem>

        <SettingItem>
          <SettingTitle title={t('style')} description={t('styleDesc')} />
          <SettingTextarea
            value={currentUserConfig?.style || ""}
            onChange={(value) => {
              onUpdateFields("style", value);
            }}
          />
        </SettingItem>

        {showFeedbackSetting && (
          <SettingItem>
            <SettingTitle
              title={t('improveOverTime')}
              description={t('improveOverTimeDesc')}
            />
            <SettingCheckbox
              value={currentUserConfig?.settings.USE_FEEDBACK || false}
              onChange={(value) => {
                onUpdateSettings("USE_FEEDBACK", value);
              }}
            />
          </SettingItem>
        )}
      </SettingGroup>
    </SettingCard>
  );
}
