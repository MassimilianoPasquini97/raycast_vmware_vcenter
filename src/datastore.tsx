import { vCenter } from "./api/vCenter";
import { GetServer, GetSelectedServer } from "./api/function";
import { DatastoreSummary } from "./api/types";
import * as React from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast, LocalStorage } from "@raycast/api";
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
    data: Datastores,
    revalidate: RevalidateDatastores,
    isLoading: IsLoadingDatastores,
  } = usePromise(GetDatastoreList, [], {
    execute: false,
    onData: async () => {
      await showToast({ style: Toast.Style.Success, title: "Data Loaded" });
    },
    onError: async (error) => {
      await showToast({ style: Toast.Style.Failure, title: "Error", message: error.message });
    },
  });
  const [showDetail, setShowDetail]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = React.useState(false);

  /**
   * Get All Datastore available on Current Server.
   * @returns {Promise<DatastoreSummary[]>}
   */
  async function GetDatastoreList(): Promise<DatastoreSummary[]> {
    let datastore: DatastoreSummary[] = [];
    if (vCenterApi.current) {
      const data = await vCenterApi.current.ListDatastore();
      if (data) datastore = data;
    }
    return datastore;
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
   * Datastore Action Menu.
   * @returns {JSX.Element}
   */
  function GetDatastoreAction(): JSX.Element {
    return (
      <ActionPanel title="vCenter Datastore">
        <Action
          title={showDetail ? "Hide Detail" : "Show Detail"}
          icon={showDetail ? Icon.EyeDisabled : Icon.Eye}
          onAction={() => {
            setShowDetail((prevState) => !prevState);
          }}
        />
        {!IsLoadingDatastores && (
          <Action
            title="Refresh"
            icon={Icon.Repeat}
            onAction={RevalidateDatastores}
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
  /**
   * Datastore Detail Section.
   * @param {number} index - Datastore index.
   * @returns {JSX.Element}
   */
  function GetDatastoreDetail(index: number): JSX.Element {
    const capacity_tier: Map<string, number> = new Map([
      ["KB", 1e-3],
      ["MB", 1e-6],
      ["GB", 1e-9],
      ["TB", 1e-12],
    ]);
    let capacity = "Unknown";
    let free_space = "Unknown";

    capacity_tier.forEach((value, key) => {
      if (capacity === "Unknown") {
        const s = Number(Datastores ? Datastores[index].capacity : 0) * value;
        if (s < 1000 && s > 1) {
          capacity = `${s.toFixed(2)} ${key}`;
        }
      }
      if (free_space === "Unknown") {
        const s = Number(Datastores ? Datastores[index].free_space : 0) * value;
        if (s < 1000 && s > 1) {
          free_space = `${s.toFixed(2)} ${key}`;
        }
      }
    });

    return (
      <List.Item.Detail
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Name" text={Datastores ? Datastores[index].name : ""} />
            <List.Item.Detail.Metadata.Label title="Type" text={Datastores ? Datastores[index].type : ""} />
            <List.Item.Detail.Metadata.Label title="Capacity" text={capacity} />
            <List.Item.Detail.Metadata.Label title="Free Space" text={free_space} />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  React.useEffect(() => {
    if (Server && !IsLoadingServer && ServerSelected && !IsLoadingServerSelected) {
      const cs = Server.filter((value) => value.name === ServerSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateDatastores();
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
      isLoading={IsLoadingServer || IsLoadingServerSelected || IsLoadingDatastores}
      isShowingDetail={showDetail}
      actions={GetDatastoreAction()}
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
      {Datastores &&
        Datastores.map((datastore, index) => (
          <List.Item
            key={datastore.datastore}
            id={datastore.datastore}
            title={datastore.name}
            icon={{ source: "icons/datastore/datastore.svg" }}
            detail={GetDatastoreDetail(index)}
            actions={GetDatastoreAction()}
          />
        ))}
    </List>
  );
}
