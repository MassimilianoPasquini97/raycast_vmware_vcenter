import { vCenter } from "./api/vCenter";
import { GetServer, GetSelectedServer } from "./api/function";
import { HostSummary } from "./api/types";
import { HostPowerStateIcon } from "./api/ui";
import * as React from "react";
import { List, Toast, showToast, LocalStorage, Icon, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import ServerView from "./api/ServerView";

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default function Command(): JSX.Element {
  const { data: Server, revalidate: RevalidateServer, isLoading: IsLoadingServer } = usePromise(GetServer);
  const {
    data: ServerSelected,
    revalidate: RevalidateServerSelected,
    isLoading: IsLoadingServerSelected,
  } = usePromise(GetSelectedServer);
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
   * Get All Host available on Current Server.
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
   * Change Selected Server.
   * @param {string} value - Server Name.
   */
  async function ChangeSelectedServer(value: string) {
    await LocalStorage.setItem("server_selected", value);
    RevalidateServerSelected();
  }
  /**
   * Delete Selected Server.
   */
  async function DeleteSelectedServer() {
    if (Server && Server.length > 1) {
      const NewServer = Server.filter((c) => {
        return c.name !== ServerSelected;
      });
      const NewServerSelected = Server[0].name;
      await LocalStorage.setItem("server", JSON.stringify(NewServer));
      await LocalStorage.setItem("server_selected", NewServerSelected);
    } else if (Server) {
      await LocalStorage.removeItem("server");
      await LocalStorage.removeItem("server_selected");
    }
    RevalidateServer();
    RevalidateServerSelected();
  }
  /**
   * Host Action Menu.
   * @returns {JSX.Element}
   */
  function GetHostAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Host">
        {!IsLoadingHosts && (
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            onAction={RevalidateHosts}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        )}
        <ActionPanel.Section title="vCenter Server">
          <Action
            title="Add Server"
            icon={Icon.NewDocument}
            onAction={() => {
              SetShowServerView(true);
            }}
          />
          <Action title="Edit Server" icon={Icon.Pencil} onAction={() => SetShowServerViewEdit(true)} />
          <Action title="Delete Server" icon={Icon.DeleteDocument} onAction={DeleteSelectedServer} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  React.useEffect(() => {
    if (Server && !IsLoadingServer && ServerSelected && !IsLoadingServerSelected) {
      const cs = Server.filter((value) => value.name === ServerSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateHosts();
    } else if (Server && !IsLoadingServer && !ServerSelected && !IsLoadingServerSelected) {
      const name = Server[0].name;
      LocalStorage.setItem("server_selected", name);
      RevalidateServerSelected();
    } else if (!IsLoadingServer && !Server) {
      SetShowServerView(true);
    }
  }, [Server, IsLoadingServer, ServerSelected, IsLoadingServerSelected]);

  const [ShowServerView, SetShowServerView] = React.useState(false);
  const [ShowServerViewEdit, SetShowServerViewEdit] = React.useState(false);

  React.useEffect(() => {
    if (!ShowServerView || !ShowServerViewEdit) {
      RevalidateServer();
      RevalidateServerSelected();
    }
  }, [ShowServerView, ShowServerViewEdit]);

  if (ShowServerView) return <ServerView SetShowView={SetShowServerView} />;
  if (ShowServerViewEdit && Server) return <ServerView server={ServerSelected} SetShowView={SetShowServerViewEdit} />;

  return (
    <List
      isLoading={IsLoadingServer || IsLoadingServerSelected || IsLoadingHosts}
      actions={GetHostAction()}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Available Server"
          onChange={ChangeSelectedServer}
          defaultValue={ServerSelected ? ServerSelected : undefined}
        >
          {Server && Server.map((value) => <List.Dropdown.Item title={value.name} value={value.name} />)}
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
