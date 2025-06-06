import { getPreferenceValues } from "@raycast/api";
import { GetServer } from "../api/function";
import { vCenter } from "../api/vCenter";
import { errorNoServerConfigured } from "./errors";
import { ListVm } from "./function";

const pref = getPreferenceValues();
if (!pref.certificate) process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

type Input = {
  /**
   * HTTP URL query parameter string.
   *
   * Query Parameters:
   *
   * names - Optional - String of Array
   * Names that virtual machines must have to match the filter.
   * If unset or empty, virtual machines with any name match the filter.
   *
   * folders - Optional - String of Array
   * Folders that must contain the virtual machine for the virtual machine to
   * match the filter. If unset or empty, virtual machines in any folder match
   * the filter. When clients pass a value of this structure as a parameter,
   * the field must contain identifiers for the resource type: Folder. When
   * operations return a value of this structure as a result, the field will
   * contain identifiers for the resource type: Folder.
   *
   * datacenters - Optional - String of Array
   * Hosts that must contain the virtual machine for the virtual machine to
   * match the filter. If unset or empty, virtual machines on any host match
   * the filter. When clients pass a value of this structure as a parameter,
   * the field must contain identifiers for the resource type: HostSystem.
   * When operations return a value of this structure as a result, the field
   * will contain identifiers for the resource type: HostSystem.
   *
   * clusters - Optional - String of Array
   * Clusters that must contain the virtual machine for the virtual machine
   * to match the filter. If unset or empty, virtual machines in any cluster
   * match the filter. When clients pass a value of this structure as a
   * parameter, the field must contain identifiers for the resource type:
   * ClusterComputeResource. When operations return a value of this structure
   * as a result, the field will contain identifiers for the resource type:
   * ClusterComputeResource.
   *
   * resource_pools - Optional - String of Array
   * Resource pools that must contain the virtual machine for the virtual
   * machine to match the filter. If unset or empty, virtual machines in
   * any resource pool match the filter. When clients pass a value of this
   * structure as a parameter, the field must contain identifiers for the
   * resource type: ResourcePool. When operations return a value of this
   * structure as a result, the field will contain identifiers for the
   * resource type: ResourcePool.
   *
   * power_states - Optional - Vm_Power_State of Array
   * Power states that a virtual machine must be in to match the filter.
   * If unset or empty, virtual machines in any
   * power state match the filter.
   *
   * Custom Types:
   *
   * Vm_Power_State - Enumeration - POWERED_OFF, POWERED_ON, SUSPENDED
   * The Power.State enumerated type defines the valid power states for a virtual machine.
   * POWERED_OFF : The virtual machine is powered off.
   * POWERED_ON : The virtual machine is powered on.
   * SUSPENDED : The virtual machine is suspended.
   *
   */
  searchParams?: string;
};

/**
 * Provides a list of available virtual machines with basic information present on the configured VMware vCenter infrastructure.
 * Basic information are:
 *  - "memory_size_MiB": RAM Assigned in MiB.
 *  - "vm": VM Identifier.
 *  - "name": VM Name.
 *  - "power_state": VM Power State. Can be only one of this value: "POWERED_ON", "POWERED_OFF", "SUSPENDED".
 *  - "cpu_count": Number of assigned cpu core.
 */
export default async function tool(input: Input): Promise<string> {
  /* Get vCenter Servers */
  let servers: Map<string, vCenter> | undefined;
  try {
    servers = await GetServer();
  } catch (e) {
    throw new Error(`Error Getting Configured vCenter Servers. Error Message: ${e}`);
  }
  if (!servers) throw errorNoServerConfigured;

  /* List Virtual Machines */
  const vmSummary = await ListVm(servers, input.searchParams);

  /* Return data in string format */
  let output = "";
  vmSummary.forEach((value, server) => {
    output += `vCenter Server: ${server}\n${JSON.stringify(value)}\n\n`;
  });
  return output;
}
