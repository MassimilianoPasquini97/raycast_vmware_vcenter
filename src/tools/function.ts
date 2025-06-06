import { VMSummary, VMInfo } from "../api/types";
import { vCenter } from "../api/vCenter";

/**
 * List all VMs on given vCenter Server.
 *
 * @param servers - vCenter Server Names.
 * @param searchParams - URL Search Parameters.
 * @returns Vm Summary Array.
 */
export async function ListVm(servers: Map<string, vCenter>, searchParams?: string): Promise<Map<string, VMSummary[]>> {
  /* Get VMSummary List */
  const vmSummary = new Map<string, VMSummary[] | Error>();
  await Promise.all(
    [...servers.entries()].map(async ([serverName, server]) => {
      vmSummary.set(
        serverName,
        await server.ListVM(searchParams).catch((e) => {
          return e;
        })
      );
    })
  );

  /* Verify Errors */
  vmSummary.forEach((value, server) => {
    if (value instanceof Error)
      throw new Error(`Error Getting Vm List from vCenter Server "${server}". Error: ${value.message}`);
  });

  return vmSummary as Map<string, VMSummary[]>;
}

/**
 * Get VMs Info about specific VM on given vCenter Server.
 *
 * @param servers - vCenter Server Names.
 * @param searchParams - URL Search Parameters.
 * @returns Map where key is vCenter Server name and value are Virtual Machine Detailed Info.
 */
export async function GetVmInfo(servers: Map<string, vCenter>, searchParams?: string): Promise<Map<string, VMInfo[]>> {
  /* Get VMSummary List */
  const vmSummary = await ListVm(servers, searchParams);

  /* Get Vm Info */
  const vmInfo = new Map<string, VMInfo[]>();
  await Promise.all(
    [...vmSummary.entries()].map(async ([serverName, vmS]) => {
      if (!vmS || vmS.length === 0) return;

      const vmI = await Promise.all(
        vmS.map(async (item) => {
          const server = servers.get(serverName)!;
          return await server.GetVM(item.vm).catch((e) => {
            console.error(e);
          });
        })
      );

      vmInfo.set(serverName, vmI.filter((value) => value !== undefined) as VMInfo[]);
    })
  );

  return vmInfo;
}

/**
 * Generate a Console Ticket for given VM and return connection url.
 *
 * @param servers - vCenter Server Names.
 * @param searchParams - URL Search Parameters.
 * @returns Console Ticket Url.
 */
export async function GetVmConsoleUrl(servers: Map<string, vCenter>, searchParams?: string): Promise<string[]> {
  /* Get VMSummary List */
  const vmSummary = await ListVm(servers, searchParams);

  /* Get Console Ticket */
  const tickets: string[] = [];
  for (const [serverName, vms] of [...vmSummary.entries()]) {
    const server = servers.get(serverName);
    for (const vm of vms) {
      if (!server) throw new Error(`Can't find vCenter server with name "${serverName}"`);
      const ticket = await server.VMCreateConsoleTickets(vm.vm);
      if (!ticket) throw new Error(`Can't generate a Console Ticket for vm "${vm.name}"`);
      tickets.push(ticket.ticket);
    }
  }

  return tickets;
}
