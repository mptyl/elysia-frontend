import { getRequestConfig } from "next-intl/server";

// Default server-side config for next-intl.
// Actual locale switching happens client-side via I18nContext / NextIntlClientProvider.
// This only provides a fallback for static generation / server rendering.
export default getRequestConfig(async () => {
  const locale = "it";
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
    timeZone: "Europe/Rome",
    now: new Date(),
  };
});
