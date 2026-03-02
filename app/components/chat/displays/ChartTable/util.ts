const CHART_COUNT = 32;

function getCSSVar(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export const getColor = (index: number) => {
  const varValue = getCSSVar(`--chart-${(index % CHART_COUNT) + 1}`);
  if (varValue) return `hsl(${varValue})`;

  // SSR / fallback
  const fallback = [
    "#27537B", "#009A9B", "#D95550", "#4E55A2",
    "#357BA0", "#9BC8ED", "#264A6F", "#5E93C4",
    "#8AB4BB", "#B8860B", "#55B8A2", "#5C6B65",
    "#EF8C8C", "#E8C95B", "#7D8A86", "#9FCCE3",
    "#F3B87A", "#A87AA8", "#2E7D8C", "#958A8A",
    "#2B8F6F", "#2B4247", "#B55959", "#9E8740",
    "#4A6268", "#6E9EB0", "#A77B5F", "#7D4D6E",
    "#1E5C6E", "#615A5A", "#21735A", "#1E3A3E",
  ];
  return fallback[index % fallback.length];
};

export const getAxisColor = (token: string): string => {
  const v = getCSSVar(token);
  return v ? `hsl(${v})` : token === "--border" ? "#D1D5DB" : "#6B7280";
};
