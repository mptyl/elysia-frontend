"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { TbManualGearboxFilled, TbArrowBackUp } from "react-icons/tb";
import { DeleteButton } from "@/app/components/navigation/DeleteButton";
import { FaRobot } from "react-icons/fa";
import { IoInformationCircle } from "react-icons/io5";
import {
  SettingCard,
  SettingHeader,
  SettingGroup,
  SettingItem,
  SettingTitle,
} from "../SettingComponents";
import SettingCombobox from "../SettingCombobox";
import SettingInput from "../SettingInput";
import WarningCard from "../WarningCard";
import ModelBadges from "../ModelBadge";
import { BackendConfig, ModelProvider } from "@/app/types/objects";

interface ModelsSectionProps {
  currentUserConfig: BackendConfig | null;
  modelsData: { [key: string]: ModelProvider } | null;
  loadingModels: boolean;
  modelsIssues: string[];
  baseProviderValid?: boolean;
  baseModelValid?: boolean;
  complexProviderValid?: boolean;
  complexModelValid?: boolean;
  onUpdateSettings: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyOrUpdates: string | Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value?: any
  ) => void;
  onUpdateConfig: (config: BackendConfig) => void;
  setChangedConfig: (changed: boolean) => void;
  showDocumentation?: boolean; // Option to show/hide "Available Models" button
  title?: string; // Optional title override
  onResetConfig?: () => void; // Optional reset function for tree settings
}

/**
 * Component for configuring AI models settings
 * Handles base and complex model selection, provider settings, and API base URL
 */
export default function ModelsSection({
  currentUserConfig,
  modelsData,
  loadingModels,
  modelsIssues,
  baseProviderValid = true,
  baseModelValid = true,
  complexProviderValid = true,
  complexModelValid = true,
  onUpdateSettings,
  onUpdateConfig,
  setChangedConfig,
  showDocumentation = true,
  title = "Models",
  onResetConfig,
}: ModelsSectionProps) {
  const t = useTranslations("config");

  return (
    <SettingCard>
      <SettingHeader
        icon={<TbManualGearboxFilled />}
        className="bg-alt_color_a"
        header={title}
        buttonIcon={showDocumentation ? <FaRobot /> : undefined}
        buttonText={showDocumentation ? t('availableModels') : undefined}
        onClick={
          showDocumentation
            ? () => {
              window.open("https://openrouter.ai/models", "_blank");
            }
            : undefined
        }
      />

      {/* Warning Card for Models Issues */}
      {modelsIssues.length > 0 && (
        <WarningCard
          title={t('modelConfigRequired')}
          issues={modelsIssues}
        />
      )}

      <SettingGroup>
        {/* Base Model Configuration */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-start gap-2">
              <p className="text-primary font-bold">{t('baseModel')}</p>
            </div>
            <p className="text-sm text-secondary">
              {t('baseModelDescription')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            <div className="w-full">
              <p className="text-sm text-secondary mb-2">{t('provider')}</p>
              <SettingCombobox
                value={currentUserConfig?.settings.BASE_PROVIDER || ""}
                values={modelsData ? Object.keys(modelsData) : []}
                onChange={(value) => {
                  // Update both provider and clear model in a single state update
                  if (currentUserConfig) {
                    onUpdateConfig({
                      ...currentUserConfig,
                      settings: {
                        ...currentUserConfig.settings,
                        BASE_PROVIDER: value,
                        BASE_MODEL: "", // Clear base model when provider changes
                      },
                    });
                    setChangedConfig(true);
                  }
                }}
                placeholder={
                  loadingModels ? t('loadingProviders') : t('selectProvider')
                }
                searchPlaceholder={t('searchProviders')}
                isInvalid={!baseProviderValid}
              />
            </div>
            {currentUserConfig?.settings.BASE_PROVIDER && (
              <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <p className="text-sm text-secondary">{t('model')}</p>
                  <ModelBadges
                    modelsData={modelsData}
                    provider={currentUserConfig?.settings.BASE_PROVIDER || ""}
                    model={currentUserConfig?.settings.BASE_MODEL || ""}
                  />
                </div>
                <SettingCombobox
                  value={currentUserConfig?.settings.BASE_MODEL || ""}
                  values={
                    modelsData && currentUserConfig?.settings.BASE_PROVIDER
                      ? Object.keys(
                        modelsData[
                        currentUserConfig.settings.BASE_PROVIDER
                        ] || {}
                      )
                      : []
                  }
                  onChange={(value) => {
                    onUpdateSettings("BASE_MODEL", value);
                  }}
                  placeholder={
                    loadingModels ? t('loadingModels') : t('selectModel')
                  }
                  searchPlaceholder={t('searchModels')}
                  isInvalid={!baseModelValid}
                />
              </div>
            )}
          </div>
        </div>

        {/* Complex Model Configuration */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-start gap-2">
              <p className="text-primary font-bold">{t('complexModel')}</p>
            </div>
            <p className="text-sm text-secondary">
              {t('complexModelDescription')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4 w-full">
            <div className="w-full">
              <p className="text-sm text-secondary mb-2">{t('provider')}</p>
              <SettingCombobox
                value={currentUserConfig?.settings.COMPLEX_PROVIDER || ""}
                values={modelsData ? Object.keys(modelsData) : []}
                onChange={(value) => {
                  // Update both provider and clear model in a single state update
                  if (currentUserConfig) {
                    onUpdateConfig({
                      ...currentUserConfig,
                      settings: {
                        ...currentUserConfig.settings,
                        COMPLEX_PROVIDER: value,
                        COMPLEX_MODEL: "", // Clear complex model when provider changes
                      },
                    });
                    setChangedConfig(true);
                  }
                }}
                placeholder={
                  loadingModels ? t('loadingProviders') : t('selectProvider')
                }
                searchPlaceholder={t('searchProviders')}
                isInvalid={!complexProviderValid}
              />
            </div>
            {currentUserConfig?.settings.COMPLEX_PROVIDER && (
              <div className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <p className="text-sm text-secondary">{t('model')}</p>
                  <ModelBadges
                    modelsData={modelsData}
                    provider={
                      currentUserConfig?.settings.COMPLEX_PROVIDER || ""
                    }
                    model={currentUserConfig?.settings.COMPLEX_MODEL || ""}
                  />
                </div>
                <SettingCombobox
                  value={currentUserConfig?.settings.COMPLEX_MODEL || ""}
                  values={
                    modelsData && currentUserConfig?.settings.COMPLEX_PROVIDER
                      ? Object.keys(
                        modelsData[
                        currentUserConfig.settings.COMPLEX_PROVIDER
                        ] || {}
                      )
                      : []
                  }
                  onChange={(value) => {
                    onUpdateSettings("COMPLEX_MODEL", value);
                  }}
                  placeholder={
                    loadingModels ? t('loadingModels') : t('selectModel')
                  }
                  searchPlaceholder={t('searchModels')}
                  isInvalid={!complexModelValid}
                />
              </div>
            )}
          </div>
        </div>

        <SettingItem>
          <SettingTitle
            title={t('apiBaseUrl')}
            description={t('customEndpoints')}
          />
          <SettingInput
            isProtected={false}
            value={currentUserConfig?.settings.MODEL_API_BASE || ""}
            onChange={(value) => {
              onUpdateSettings("MODEL_API_BASE", value);
            }}
          />
        </SettingItem>

        {/* Model Usage Disclaimer */}
        <div className="flex flex-col gap-2 bg-highlight/10 rounded-lg p-3 text-sm text-highlight">
          <div className="flex flex-row gap-1 items-center">
            <IoInformationCircle className="text-highlight" />
            <p className="font-bold text-highlight">Note</p>
          </div>
          <p>
            You can use the same model for both base and complex tasks. Using
            different models allows you to balance speed vs quality - faster
            models for simple tasks and more capable models for complex
            reasoning.
          </p>
        </div>

        <div className="flex flex-col gap-2 bg-alt_color_b/10 rounded-lg p-3 text-sm text-alt_color_b">
          <div className="flex flex-row gap-1 items-center">
            <IoInformationCircle className="text-alt_color_b" />
            <p className="font-bold text-alt_color_b">Recommendation</p>
          </div>
          <p>
            Atena is optimized for Gemini models. We recommend using Gemini
            models over OpenAI models for the best performance if possible.
          </p>
        </div>

        {/* Reset config button for tree settings */}
        {onResetConfig && (
          <div className="flex w-full items-center justify-center pt-4">
            <DeleteButton
              onClick={onResetConfig}
              text={t('resetConfig')}
              icon={<TbArrowBackUp />}
              confirmText={t('areYouSure')}
            />
          </div>
        )}
      </SettingGroup>
    </SettingCard>
  );
}
