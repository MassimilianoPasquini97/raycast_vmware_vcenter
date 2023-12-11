import { vCenter } from "./api/vCenter";
import { GetContext, GetSelectedContext } from "./api/function";
import { NetworkSummary } from "./api/types";
import * as React from "react";
import { List, Toast, showToast, LocalStorage, Action, ActionPanel, Icon } from "@raycast/api";
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
    data: Networks,
    revalidate: RevalidateNetworks,
    isLoading: IsLoadingNetworks,
  } = usePromise(GetNetworksList, [], {
    execute: false,
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });

  /**
   * Get All Network available on Current Context.
   * @returns {Promise<NetworkSummary[]>}
   */
  async function GetNetworksList(): Promise<NetworkSummary[]> {
    let network: NetworkSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.ListNetwork();
      if (data) network = data;
    }
    return network;
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
        <Action title="Edit Context" icon={Icon.Pencil} onAction={() => SetShowContextViewEdit(true)} />
        <Action title="Delete Context" icon={Icon.DeleteDocument} onAction={DeleteSelectedContext} />
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (Context && !IsLoadingContext && ContextSelected && !IsLoadingContextSelected) {
      const cs = Context.filter((value) => value.name === ContextSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateNetworks();
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
      isLoading={IsLoadingContext && IsLoadingContextSelected && IsLoadingNetworks}
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
      {Networks &&
        Networks.map((network) => (
          <List.Item
            key={network.network}
            id={network.network}
            title={network.name}
            icon={{ source: "icons/network/network.svg" }}
            actions={GetHostAction()}
          />
        ))}
    </List>
  );
}
