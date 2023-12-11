import { vCenter } from "./api/vCenter";
import { GetContext, GetSelectedContext } from "./api/function";
import { HostSummary } from "./api/types";
import { HostPowerStateIcon } from "./api/ui";
import * as React from "react";
import { List, Toast, showToast, LocalStorage, Icon, ActionPanel, Action } from "@raycast/api";
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
    data: Hosts,
    revalidate: RevalidateHosts,
    isLoading: IsLoadingHosts,
  } = usePromise(GetHostList, [], {
    execute: false,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Data Loaded" });
    },
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });

  /**
   * Get All Host available on Current Context.
   * @returns {Promise<HostSummary[]>}
   */
  async function GetHostList(): Promise<HostSummary[]> {
    let host: HostSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.ListHost();
      if (data) host = data;
    }
    return host;
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
    RevalidateContext();
    RevalidateContextSelected();
  }
  /**
   * Host Action Menu.
   * @returns {JSX.Element}
   */
  function GetHostAction(): JSX.Element {
    return (
      <ActionPanel title="Context Manager">
        <Action
          title="New Context"
          icon={Icon.NewDocument}
          onAction={() => {
            SetShowContextView(true);
          }}
        />
        <Action
          title="Refresh"
          icon={Icon.Repeat}
          onAction={RevalidateHosts}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
        <Action title="Edit Context" icon={Icon.Pencil} onAction={() => SetShowContextViewEdit(true)} />
        <Action title="Delete Context" icon={Icon.DeleteDocument} onAction={DeleteSelectedContext} />
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (Context && !IsLoadingContext && ContextSelected && !IsLoadingContextSelected) {
      const cs = Context.filter((value) => value.name === ContextSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateHosts();
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
      isLoading={IsLoadingContext || IsLoadingContextSelected || IsLoadingHosts}
      actions={GetHostAction()}
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
      {Hosts &&
        Hosts.map((host) => (
          <List.Item
            key={host.host}
            id={host.host}
            title={host.name}
            icon={HostPowerStateIcon.get(host.power_state)}
            actions={GetHostAction()}
          />
        ))}
    </List>
  );
}
