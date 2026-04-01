import { BasePayload } from "@/app/types/payloads";
import { host } from "@/app/components/host";

export async function renameConversation(
  user_id: string,
  conversation_id: string,
  title: string,
): Promise<BasePayload> {
  const startTime = performance.now();
  try {
    const response = await fetch(
      `${host}/db/${user_id}/rename_tree/${conversation_id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      },
    );

    if (!response.ok) {
      console.error(
        `Error renaming conversation ${conversation_id}! status: ${response.status} ${response.statusText}`,
      );
      return {
        error: `Error renaming conversation ${conversation_id}`,
      };
    }

    const data: BasePayload = await response.json();
    return data;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return {
      error: `Error renaming conversation ${conversation_id}`,
    };
  } finally {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `renameConversation ${conversation_id} took ${(performance.now() - startTime).toFixed(2)}ms`,
      );
    }
  }
}
