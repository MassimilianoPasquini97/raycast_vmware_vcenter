import { vCenter } from "./api/vCenter";
import { GetContext, GetSelectedContext } from "./api/function";
import { DatastoreSummary } from "./api/types";
import * as React from "react";
import { ActionPanel, Action, Icon, List, Toast, showToast, LocalStorage } from "@raycast/api";
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
   * Get All Datastore available on Current Context.
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
    if (Context && !IsLoadingContext && ContextSelected && !IsLoadingContextSelected) {
      const cs = Context.filter((value) => value.name === ContextSelected)[0];
      vCenterApi.current = new vCenter(cs.server, cs.username, cs.password);
      RevalidateDatastores();
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
      isLoading={IsLoadingContext || IsLoadingContextSelected || IsLoadingDatastores}
      isShowingDetail={showDetail}
      actions={GetDatastoreAction()}
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
