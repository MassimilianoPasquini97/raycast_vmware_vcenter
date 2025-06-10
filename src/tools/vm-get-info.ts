import { getPreferenceValues } from "@raycast/api";
import { GetServer } from "../api/function";
import { errorNoServerConfigured } from "./errors";
import { DataToPromptVmInfo, GetVmInfo } from "./function";
import { InputVmIds, OutputVmInfo } from "./type";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

/**
 * Provide all information available of one or more specified virtual machine.
 */
export default async function tool(input: InputVmIds): Promise<string> {
  /* Get vCenter Servers */
  let servers = await GetServer();
  if (!servers) throw errorNoServerConfigured;

  /* Get Virtual Machines Info */
  const vmInfo = await Promise.all(
    input.vm.map(async (vm): Promise<OutputVmInfo> => {
      return await GetVmInfo(servers!, vm).catch((e) => {
        console.error(e);
        return vm;
      });
    })
  );

  /* Return data in string format */
  let output = "";
  vmInfo.forEach((value, server) => {
    output += `vCenter Server: ${server}\n${JSON.stringify(value)}\n\n`;
  });
  return DataToPromptVmInfo(vmInfo);
}
