import { Server } from "./types";
import { LocalStorage } from "@raycast/api";
import { vCenter } from "./vCenter";

/**
 * Get Saved Server from LocalStorage
 * @returns {Promise<Map<string, vCenter[] | undefined>>} Return Saved Server if present otherwise undefined value.
 */
export async function GetServer(): Promise<Map<string, vCenter> | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    const o: Map<string, vCenter> = new Map();
    const s: Server[] = JSON.parse(json as string);
    s.forEach((d) => {
      o.set(d.name, new vCenter(d.server, d.username, d.password));
    });
    return o;
  } else {
    return undefined;
  }
}

/**
 * Get Saved Server from LocalStorage
 * @returns {Promise<Server[] | undefined>} Return Saved Server if present otherwise undefined value.
 */
export async function GetServerLocalStorage(): Promise<Server[] | undefined> {
  const json = await LocalStorage.getItem("server");
  if (json) {
    return JSON.parse(json as string) as Server[];
  } else {
    return undefined;
  }
}

/**
 * Get Saved Selected Server from LocalStorage
 * @returns {Promise<string | undefined>} Return Selected Server if present otherwise undefined value.
 */
export async function GetSelectedServer(): Promise<string | undefined> {
  const json = await LocalStorage.getItem("server_selected");
  if (json) {
    return json as string;
  } else {
    return undefined;
  }
}
