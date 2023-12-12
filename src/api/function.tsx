import { Server } from "./types";
import { LocalStorage } from "@raycast/api";

/**
 * Get Saved Server from LocalStorage
 * @returns {Server[] | undefined} Return Saved Server if present otherwise undefined value.
 */
export async function GetServer(): Promise<Server[] | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    return JSON.parse(json as string) as Server[];
  } else {
    return undefined;
  }
}

/**
 * Get Saved Selected Server from LocalStorage
 * @returns {string | undefined} Return Selected Server if present otherwise undefined value.
 */
export async function GetSelectedServer(): Promise<string | undefined> {
  const json = await LocalStorage.getItem("server_selected");
  if (json) {
    return json as string;
  } else {
    return undefined;
  }
}
