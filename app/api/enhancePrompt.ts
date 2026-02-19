import { host } from "@/app/components/host";

export interface EnhancePromptPayload {
  enhanced_prompt: string;
  feedback: string;
  error: string;
}

export async function enhancePrompt(
  user_id: string,
  conversation_id: string,
  prompt: string | null,
  suggestion: string,
): Promise<EnhancePromptPayload> {
  const startTime = performance.now();
  try {
    const response = await fetch(`${host}/util/enhance_prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id,
        conversation_id,
        prompt,
        suggestion,
      }),
    });

    if (!response.ok) {
      return {
        enhanced_prompt: "",
        feedback: "",
        error: `HTTP ${response.status} ${response.statusText}`,
      };
    }

    const data: EnhancePromptPayload = await response.json();
    return data;
  } catch (error) {
    return {
      enhanced_prompt: "",
      feedback: "",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `util/enhance_prompt took ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    }
  }
}
