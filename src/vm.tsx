import { vCenter } from "./api/vCenter";
import {
  VMInfo,
  VMSummary,
  VmPowerState,
  VmStoragePolicyInfo,
  NetworkSummary,
  VMGuestPowerAction,
  VMPowerAction,
  StoragePoliciesSummary,
  VMStoragePolicyComplianceInfo,
  VmStoragePolicyComplianceStatus,
  VmGuestNetworkingInterfacesInfo,
} from "./api/types";
import {
  PowerModeIcons,
  PowerModeIconsMetadata,
  PowerModeTextMetadata,
  VMGuestPowerActionIcons,
  VMPowerActionIcons,
  VMStoragePolicyComplianceText,
  VMStoragePolicyComplianceColor,
  VMStoragePolicyComplianceIcon,
  OsTextMetadata,
  OsIconsMetadata,
} from "./api/ui";
import { GetContext, GetSelectedContext } from "./api/function";
import * as React from "react";
import { List, Toast, Icon, Action, ActionPanel, showToast, Color, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ContextView from "./api/ContextView";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const { data: Context, revalidate: RevalidateContext, isLoading: IsLoadingContext } = usePromise(GetContext);
  const {
    data: ContextSelected,
    revalidate: RevalidateContextSelected,
    isLoading: IsLoadingContextSelected,
  } = usePromise(GetSelectedContext);
  const vCenterApi = React.useRef<vCenter | undefined>();
  const {
    data: VMs,
    revalidate: RevalidateVMs,
    isLoading: IsLoadingVMs,
  } = usePromise(GetVmList, [], {
    execute: false,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Data Loaded" });
    },
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const {
    data: Networks,
    revalidate: RevalidateNetworks,
    isLoading: IsLoadingNetworks,
  } = usePromise(GetNetworks, [], {
    execute: false,
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const {
    data: StoragePolicies,
    revalidate: RevalidateStoragePolicies,
    isLoading: IsLoadingStoragePolicies,
  } = usePromise(GetStoragePolicies, [], {
    execute: false,
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const [isLoading, setIsLoading]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);
  const [selectedVM, setSelectedVM]: [string, React.Dispatch<React.SetStateAction<string>>] = React.useState("");
  const [VMsInfo, setVMsInfo]: [Map<string, VMInfo>, React.Dispatch<React.SetStateAction<Map<string, VMInfo>>>] =
    React.useState(new Map());
  const [VMsGuestNetworkingInterfaces, setVMsGuestNetworkingInterfaces]: [
    Map<string, VmGuestNetworkingInterfacesInfo[]>,
    React.Dispatch<React.SetStateAction<Map<string, VmGuestNetworkingInterfacesInfo[]>>>
  ] = React.useState(new Map());
  const [VMsStoragePolicy, setVMsStoragePolicy]: [
    Map<string, VmStoragePolicyInfo>,
    React.Dispatch<React.SetStateAction<Map<string, VmStoragePolicyInfo>>>
  ] = React.useState(new Map());
  const [VMsStoragePolicyCompliance, setVMsStoragePolicyCompliance]: [
    Map<string, VMStoragePolicyComplianceInfo>,
    React.Dispatch<React.SetStateAction<Map<string, VMStoragePolicyComplianceInfo>>>
  ] = React.useState(new Map());

  /**
   * Get All VM available on Current Context.
   * @returns {Promise<VMSummary[]>}
   */
  async function GetVmList(): Promise<VMSummary[]> {
    let vms: VMSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.ListVM();
      if (data) vms = data;
    }
    return vms;
  }
  /**
   * Get All Network available on Current Context.
   * @returns {Promise<NetworkSummary[]>}
   */
  async function GetNetworks(): Promise<NetworkSummary[]> {
    let networks: NetworkSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.ListNetwork();
      if (data) networks = data;
    }
    return networks;
  }
  /**
   * Get All Storage Policies available on Current Context.
   * @returns {Promise<StoragePoliciesSummary[]>}
   */
  async function GetStoragePolicies(): Promise<StoragePoliciesSummary[]> {
    let storagePolicies: StoragePoliciesSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.GetStoragePolicy();
      if (data) storagePolicies = data;
    }
    return storagePolicies;
  }
  /**
   * Get Network Name.
   * @param {string} network - Network Identifier.
   * @returns
   */
  function GetNetworkName(network: string): string {
    if (Networks) {
      const filter = Networks.filter((net) => net.network === network);
      if (filter.length > 0) return filter[0].name;
    }
    return network;
  }
  /**
   * Perform Power Action on VM Using Guest Tools.
   * @param {string} vm - vm identifier.
   * @param {VMGuestPowerAction} action - action to perform.
   */
  async function VMGuestAction(vm: string, action: VMGuestPowerAction): Promise<void> {
    const MessageGuestActionStarted: Map<VMGuestPowerAction, string> = new Map([
      [VMGuestPowerAction.REBOOT, `Rebooting`],
      [VMGuestPowerAction.SHUTDOWN, `Shuting Down`],
      [VMGuestPowerAction.STANDBUY, `is Suspending`],
    ]);
    const MessageGuestActionFinished: Map<VMGuestPowerAction, string> = new Map([
      [VMGuestPowerAction.REBOOT, `Rebooted`],
      [VMGuestPowerAction.SHUTDOWN, `Powered Off`],
      [VMGuestPowerAction.STANDBUY, `Suspended`],
    ]);
    await showToast({
      style: Toast.Style.Animated,
      title: `${VMsInfo.get(vm)?.name}`,
      message: `${MessageGuestActionStarted.get(action)}`,
    });
    if (vCenterApi.current)
      await vCenterApi.current
        .VMGuestPower(vm, action)
        .then(
          async () =>
            await showToast({
              style: Toast.Style.Success,
              title: `${VMsInfo.get(vm)?.name}`,
              message: `${MessageGuestActionFinished.get(action)}`,
            })
        )
        .catch(
          async (error) =>
            await showToast({ style: Toast.Style.Failure, title: `${VMsInfo.get(vm)?.name}`, message: `${error}` })
        );
  }
  /**
   * Perform Power Action on VM.
   * @param {string} vm - vm identifier.
   * @param {VMPowerAction} action - action to perform.
   */
  async function VMAction(vm: string, action: VMPowerAction): Promise<void> {
    const MessageActionStarted: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooting`],
      [VMPowerAction.START, `Starting`],
      [VMPowerAction.STOP, `Shuting Down`],
      [VMPowerAction.SUSPEND, `Suspending`],
    ]);
    const MessageActionFinished: Map<VMPowerAction, string> = new Map([
      [VMPowerAction.RESET, `Rebooted`],
      [VMPowerAction.START, `Powered On`],
      [VMPowerAction.STOP, `Powered Off`],
      [VMPowerAction.SUSPEND, `Suspended`],
    ]);
    await showToast({
      style: Toast.Style.Animated,
      title: `${VMsInfo.get(vm)?.name}`,
      message: `${MessageActionStarted.get(action)}`,
    });
    if (vCenterApi.current)
      await vCenterApi.current
        .VMPower(vm, action)
        .then(
          async () =>
            await showToast({
              style: Toast.Style.Success,
              title: `${VMsInfo.get(vm)?.name}`,
              message: `${MessageActionFinished.get(action)}`,
            })
        )
        .catch(
          async (error) =>
            await showToast({ style: Toast.Style.Failure, title: `${VMsInfo.get(vm)?.name}`, message: `${error}` })
        );
  }
  /**
   * Change Selected Context.
   * @param {string} value - Context Name.
   */
  async function ChangeSelectedContext(value: string) {
    await LocalStorage.setItem("context_selected", value);
    RevalidateContextSelected();
  }
  /**
   * Delete Selected Context.
   */
  async function DeleteSelectedContext() {
    if (Context && Context.length > 1) {
      const NewContext = Context.filter((c) => {
        return c.name !== ContextSelected;
      });
      const NewContextSelected = Context[0].name;
      await LocalStorage.setItem("context", JSON.stringify(NewContext));
      await LocalStorage.setItem("context_selected", NewContextSelected);
    } else if (Context) {
      await LocalStorage.removeItem("context");
      await LocalStorage.removeItem("context_selected");
    }
    RevalidateContextSelected();
  }
  /**
   * VM Action Menu.
   * @param {string} vm - vm identifier.
   * @returns {JSX.Element}
   */
  function GetVMAction(vm?: string): JSX.Element {
    if (vm)
      return (
        <ActionPanel title="vCenter VM">
          <Action
            title={showDetail ? "Hide Detail" : "Show Detail"}
            icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => {
              setShowDetail((prevState) => !prevState);
            }}
          />
          {!IsLoadingVMs && (
            <Action
              title="Refresh"
              icon={Icon.Repeat}
              onAction={RevalidateVMs}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          )}
          <Action.OpenInBrowser
            title="Open on vCenter Web"
            url={`https://${
              Context && ContextSelected ? Context.filter((value) => value.name === ContextSelected)[0].server : ""
            }/ui/app/vm;nav=v/urn:vmomi:VirtualMachine:${vm}:${VMsInfo.get(vm)?.identity?.instance_uuid}/summary`}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
          <Action.Open
            title="Open Console"
            icon={{ source: "icons/vm/console.svg" }}
            target={`vmrc://${
              Context && ContextSelected ? Context.filter((value) => value.name === ContextSelected)[0].server : ""
            }/?moid=${vm}`}
            shortcut={{ modifiers: ["cmd"], key: "y" }}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            icon={Icon.Clipboard}
            content={VMsInfo.get(vm)?.name as string}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
          {VMsGuestNetworkingInterfaces.get(vm)?.[0].ip?.ip_addresses[0].ip_address && (
            <Action.CopyToClipboard
              title="Copy IP"
              icon={Icon.Clipboard}
              content={VMsGuestNetworkingInterfaces.get(vm)?.[0].ip?.ip_addresses[0].ip_address as string}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
          )}
          <ActionPanel.Section title="Power">
            <Action
              title="Power On"
              icon={VMPowerActionIcons.get(VMPowerAction.START)}
              onAction={() => VMAction(vm, VMPowerAction.START)}
            />
            <Action
              title="Power Off"
              icon={VMPowerActionIcons.get(VMPowerAction.STOP)}
              onAction={() => VMAction(vm, VMPowerAction.STOP)}
            />
            <Action
              title="Suspend"
              icon={VMPowerActionIcons.get(VMPowerAction.SUSPEND)}
              onAction={() => VMAction(vm, VMPowerAction.SUSPEND)}
            />
            <Action
              title="Reset"
              icon={VMPowerActionIcons.get(VMPowerAction.RESET)}
              onAction={() => VMAction(vm, VMPowerAction.RESET)}
            />
            <Action
              title="Shut Down Guest OS"
              icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.SHUTDOWN)}
              onAction={() => VMGuestAction(vm, VMGuestPowerAction.SHUTDOWN)}
            />
            <Action
              title="Restart Guest OS"
              icon={VMGuestPowerActionIcons.get(VMGuestPowerAction.REBOOT)}
              onAction={() => VMGuestAction(vm, VMGuestPowerAction.REBOOT)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Context Manager">
            <Action
              title="New Context"
              icon={Icon.NewDocument}
              onAction={() => {
                SetShowContextView(true);
              }}
            />
            <Action title="Edit Context" icon={Icon.Pencil} onAction={() => SetShowContextViewEdit(true)} />
            <Action title="Delete Context" icon={Icon.DeleteDocument} onAction={DeleteSelectedContext} />
          </ActionPanel.Section>
        </ActionPanel>
      );

    return (
      <ActionPanel title="vCenter VM">
        {!IsLoadingVMs && (
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            onAction={RevalidateVMs}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        )}
        <ActionPanel.Section title="Context Manager">
          <Action
            title="New Context"
            icon={Icon.NewDocument}
            onAction={() => {
              SetShowContextView(true);
            }}
          />
          <Action title="Edit Context" icon={Icon.Pencil} onAction={() => SetShowContextViewEdit(true)} />
          <Action title="Delete Context" icon={Icon.DeleteDocument} onAction={DeleteSelectedContext} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  /**
   * VM Detail Section.
   * @param {string} vm - vm identifier.
   * @returns {JSX.Element}
   */
  function GetVmDetail(vm: string): JSX.Element {
    const vminfo = VMsInfo.get(vm);

    if (!vminfo) return <List.Item.Detail></List.Item.Detail>;

    const cdroms = Object.values(vminfo.cdroms);
    const diskids = Object.keys(vminfo.disks);
    let diskstotal = 0;
    const nics = Object.values(vminfo.nics);

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={vminfo.name} />
            <List.Item.Detail.Metadata.Label
              title="Power State"
              icon={PowerModeIconsMetadata.get(vminfo.power_state as VmPowerState)}
              text={PowerModeTextMetadata.get(vminfo.power_state as VmPowerState)}
            />
            <List.Item.Detail.Metadata.Label
              title="OS"
              icon={OsIconsMetadata.get(vminfo.guest_OS as string)}
              text={OsTextMetadata.get(vminfo.guest_OS as string)}
            />
            <List.Item.Detail.Metadata.Label title="Boot" text={`${vminfo.boot.type}`} />
            <List.Item.Detail.Metadata.Label title="Cpu" icon={Icon.ComputerChip} text={`${vminfo.cpu.count} cores`} />
            <List.Item.Detail.Metadata.Label
              title="Memory"
              icon={Icon.MemoryChip}
              text={`${vminfo.memory.size_MiB / 1024} GB`}
            />
            {cdroms.length > 0 &&
              cdroms.map((cdrom) => {
                if (cdrom.backing.iso_file)
                  return (
                    <List.Item.Detail.Metadata.Label
                      title={`${cdrom.label}`}
                      key={`${cdrom.label}`}
                      icon={Icon.Cd}
                      text={cdrom.backing.iso_file}
                    />
                  );
              })}
            <List.Item.Detail.Metadata.Separator />
            {diskids.map((id) => {
              diskstotal = diskstotal + (vminfo.disks[id].capacity as number);
              const storagePolicyFiltered = StoragePolicies
                ? StoragePolicies.filter((policy) => policy.policy === VMsStoragePolicy.get(vm)?.disks[id])
                : [];
              return (
                <React.Fragment>
                  <List.Item.Detail.Metadata.Label
                    key={`${vminfo.disks[id].label} Capacity`}
                    title={`${vminfo.disks[id].label} Capacity`}
                    icon={Icon.HardDrive}
                    text={`${((vminfo.disks[id].capacity as number) / 1e9).toFixed(0)} GiB`}
                  />
                  {(VMsStoragePolicy.has(vm) || VMsStoragePolicyCompliance.has(vm)) && (
                    <List.Item.Detail.Metadata.TagList title="Storage Policy">
                      {VMsStoragePolicy.has(vm) && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy: ${VMsStoragePolicy.get(vm)?.disks[id]}`}
                          text={`${storagePolicyFiltered.length > 0 && storagePolicyFiltered[0].name}`}
                          color={Color.Blue}
                          icon={Icon.CodeBlock}
                        />
                      )}
                      {VMsStoragePolicyCompliance.has(vm) && (
                        <List.Item.Detail.Metadata.TagList.Item
                          key={`Storage Policy Compliance: ${VMsStoragePolicyCompliance.get(vm)?.disks[id].status}`}
                          text={`${VMStoragePolicyComplianceText.get(
                            VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          icon={`${VMStoragePolicyComplianceIcon.get(
                            VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                          )}`}
                          color={
                            VMStoragePolicyComplianceColor.get(
                              VMsStoragePolicyCompliance.get(vm)?.disks[id].status as VmStoragePolicyComplianceStatus
                            ) as Color
                          }
                        />
                      )}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                </React.Fragment>
              );
            })}
            {diskids.length > 1 && (
              <React.Fragment>
                <List.Item.Detail.Metadata.Label
                  key="Total Disks Capacity"
                  title="Total Disks Capacity"
                  icon={Icon.HardDrive}
                  text={`${(diskstotal / 1e9).toFixed(0)} GiB`}
                />
                <List.Item.Detail.Metadata.Separator />
              </React.Fragment>
            )}
            {nics.map((nic) => {
              const guestNetworkingInterfaces = VMsGuestNetworkingInterfaces.get(vm)?.filter(
                (nicGuest) => nicGuest.mac_address === nic.mac_address
              );
              return (
                <React.Fragment>
                  <List.Item.Detail.Metadata.Label
                    key={nic.label}
                    title={`${nic.label}`}
                    icon={Icon.Network}
                    text={`${GetNetworkName(nic.backing.network)}`}
                  />
                  {guestNetworkingInterfaces && guestNetworkingInterfaces.length > 0 && (
                    <List.Item.Detail.Metadata.TagList title="IPs">
                      {guestNetworkingInterfaces &&
                        guestNetworkingInterfaces.length > 0 &&
                        guestNetworkingInterfaces[0].ip?.ip_addresses.map((ip) => {
                          return (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={`${ip.ip_address}`}
                              text={`${ip.ip_address}`}
                            />
                          );
                        })}
                    </List.Item.Detail.Metadata.TagList>
                  )}
                  <List.Item.Detail.Metadata.Separator />
                </React.Fragment>
              );
            })}
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  React.useEffect(() => {
    if (vCenterApi.current && selectedVM) {
      setIsLoading(true);
      if (!VMsInfo.has(selectedVM)) {
        vCenterApi.current
          .GetVM(selectedVM)
          .then((vm) => {
            if (vm)
              setVMsInfo((prevState) => {
                prevState.set(selectedVM, vm);
                return new Map([...prevState]);
              });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsGuestNetworkingInterfaces.has(selectedVM) && showDetail) {
        vCenterApi.current
          .GetVMGuestNetworkingInterfaces(selectedVM)
          .then((interfaces) => {
            if (interfaces)
              setVMsGuestNetworkingInterfaces((prevState) => {
                prevState.set(selectedVM, interfaces);
                return new Map([...prevState]);
              });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsStoragePolicy.has(selectedVM) && showDetail) {
        vCenterApi.current
          .GetVMStoragePolicy(selectedVM)
          .then((policy) => {
            if (policy)
              if (policy)
                setVMsStoragePolicy((prevState) => {
                  prevState.set(selectedVM, policy);
                  return new Map([...prevState]);
                });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      if (!VMsStoragePolicyCompliance.has(selectedVM) && showDetail) {
        vCenterApi.current
          .GetVMStoragePolicyCompliance(selectedVM)
          .then((policy) => {
            if (policy)
              if (policy)
                setVMsStoragePolicyCompliance((prevState) => {
                  prevState.set(selectedVM, policy);
                  return new Map([...prevState]);
                });
          })
          .catch(async (error) => {
            await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
          });
      }
      setIsLoading(false);
    }
  }, [selectedVM, showDetail]);

  React.useEffect(() => {
    setShowDetail(false);
    setSelectedVM("");
    setVMsInfo(new Map());
    setVMsGuestNetworkingInterfaces(new Map());
    setVMsStoragePolicy(new Map());
    setVMsStoragePolicyCompliance(new Map());
  }, [VMs]);

  React.useEffect(() => {
    if (Context && !IsLoadingContext && ContextSelected && !IsLoadingContextSelected) {
      const cs = Context.filter((value) => value.name === ContextSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateVMs();
      RevalidateNetworks();
      RevalidateStoragePolicies();
    } else if (Context && !IsLoadingContext && !ContextSelected && !IsLoadingContextSelected) {
      const name = Context[0].name;
      LocalStorage.setItem("context_selected", name);
      RevalidateContextSelected();
    } else if (!IsLoadingContext && !Context) {
      SetShowContextView(true);
    }
  }, [Context, IsLoadingContext, ContextSelected, IsLoadingContextSelected]);

  const [ShowContextView, SetShowContextView] = React.useState(false);
  const [ShowContextViewEdit, SetShowContextViewEdit] = React.useState(false);

  React.useEffect(() => {
    if (!ShowContextView || !ShowContextViewEdit) {
      RevalidateContext();
      RevalidateContextSelected();
    }
  }, [ShowContextView, ShowContextViewEdit]);

  if (ShowContextView) return <ContextView SetShowView={SetShowContextView} />;
  if (ShowContextViewEdit && Context)
    return <ContextView context={ContextSelected} SetShowView={SetShowContextViewEdit} />;

  return (
    <List
      isLoading={isLoading || IsLoadingVMs || IsLoadingNetworks || IsLoadingStoragePolicies}
      onSelectionChange={(id: string | null) => {
        setSelectedVM(id as string);
      }}
      isShowingDetail={showDetail}
      actions={GetVMAction()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Available Context"
          onChange={ChangeSelectedContext}
          defaultValue={ContextSelected ? ContextSelected : undefined}
        >
          {Context && Context.map((value) => <List.Dropdown.Item title={value.name} value={value.name} />)}
        </List.Dropdown>
      }
    >
      {VMs &&
        VMs.map((vm) => (
          <List.Item
            key={vm.vm}
            id={vm.vm}
            title={vm.name}
            icon={PowerModeIcons.get(vm.power_state)}
            detail={GetVmDetail(vm.vm)}
            actions={GetVMAction(vm.vm)}
          />
        ))}
    </List>
  );
}
