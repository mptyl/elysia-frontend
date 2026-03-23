"use client";

import { createContext, useContext, useMemo } from "react";
import { NextIntlClientProvider } from "next-intl";
import { useAuthUserId } from "@/hooks/useAuthUserId";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { PreferredLanguage } from "@/app/types/profile-types";

import enMessages from "@/messages/en.json";
import itMessages from "@/messages/it.json";

const messages: Record<PreferredLanguage, typeof enMessages> = {
  en: enMessages,
  it: itMessages,
};

interface I18nContextValue {
  locale: PreferredLanguage;
}

const I18nContext = createContext<I18nContextValue>({ locale: "it" });

export function useLocale(): PreferredLanguage {
  return useContext(I18nContext).locale;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { id: userId } = useAuthUserId();
  const { profile } = useUserProfile(userId ?? undefined);

  const locale: PreferredLanguage = profile?.preferred_language ?? "it";

  const contextValue = useMemo(() => ({ locale }), [locale]);

  return (
    <I18nContext.Provider value={contextValue}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
