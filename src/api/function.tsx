import { Context } from "./types";
import { Form, LocalStorage } from "@raycast/api";

/**
 * Get Saved Context from LocalStorage
 * @returns {Context[] | undefined} Return Saved Context if present otherwise undefined value.
 */
export async function GetContext(): Promise<Context[] | undefined> {
  const json = await LocalStorage.getItem("context");
  if (json) {
    return JSON.parse(json as string) as Context[];
  } else {
    return undefined;
  }
}

/**
 * Get Saved Selected Context from LocalStorage
 * @returns {string | undefined} Return Selected Context if present otherwise undefined value.
 */
export async function GetSelectedContext(): Promise<string | undefined> {
  const json = await LocalStorage.getItem("context_selected");
  if (json) {
    return json as string;
  } else {
    return undefined;
  }
}
