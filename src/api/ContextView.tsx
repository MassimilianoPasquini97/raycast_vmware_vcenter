import { GetContext } from "./function";
import { Action, ActionPanel, Form, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import * as React from "react";
import { Context } from "./types";
import { vCenter } from "./vCenter";
import { ErrorApiGetToken } from "./errors";

interface props {
  context?: string;
  SetShowView: React.Dispatch<React.SetStateAction<boolean>>;
}

interface FormData {
  name?: string;
  server?: string;
  username?: string;
  password?: string;
}

export default function ContextView(props: props): JSX.Element {
  const NameInfo = "Provide a Name for This Context";
  const ServerInfo = "vCenter Server FQDN or IP";
  const UsernameInfo = "vCenter Username";
  const PasswordInfo = "vCenter Password";

  const { data: Context, isLoading: IsLoadingContext } = usePromise(GetContext);

  const [NameError, SetNameError] = React.useState<string | undefined>();
  const [ServerError, SetServerError] = React.useState<string | undefined>();
  const [UsernameError, SetUsernameError] = React.useState<string | undefined>();
  const [PasswordError, SetPasswordError] = React.useState<string | undefined>();

  /**
   * Validate Name Field.
   * @param event
   */
  function ValidateName(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0) {
      if (!props.context && Context && Context.filter((c) => c.name === value).length > 0) {
        SetNameError("You Ave Already Used This Name");
        return;
      }
      DropNameError();
    } else {
      SetNameError("The Field Should't be Empty");
    }
  }
  /**
   * Drop Name Error.
   */
  function DropNameError(): void {
    if (NameError && NameError.length > 0) {
      SetNameError(undefined);
    }
  }

  /**
   * Validate Server Field.
   * @param event
   */
  function ValidateServer(event: any): void {
    const value: string = event.target.value;
    if (value && value.length > 0) {
      if (value.search(/^http[s]{0,1}:\/\//i) !== -1) {
        SetServerError("Url Not Allowed");
        return;
      }
      if (value.search(/[/]+/i) !== -1) {
        SetServerError("Invalid Characters");
        return;
      }
      DropServerError();
    } else {
      SetServerError("The Field Should't be Empty");
    }
  }
  /**
   * Drop Server Error.
   */
  function DropServerError(): void {
    if (ServerError && ServerError.length > 0) {
      SetServerError(undefined);
    }
  }

  /**
   * Validate Username Field.
   * @param event
   */
  function ValidateUsername(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0) {
      DropUsernameError();
    } else {
      SetUsernameError("The Field Should't be Empty");
    }
  }
  /**
   * Drop Server Error.
   */
  function DropUsernameError(): void {
    if (UsernameError && UsernameError.length > 0) {
      SetUsernameError(undefined);
    }
  }

  /**
   * Validate Password Field.
   * @param event
   */
  function ValidatePassword(event: any): void {
    const value = event.target.value;
    if (value && value.length > 0) {
      DropPasswordError();
    } else {
      SetPasswordError("The Field Should't be Empty");
    }
  }
  /**
   * Drop Password Error.
   */
  function DropPasswordError(): void {
    if (PasswordError && PasswordError.length > 0) {
      SetPasswordError(undefined);
    }
  }

  /**
   * Save Context to LocalStorage.
   * @param {FormData} value.
   */
  async function Save(value: FormData): Promise<void> {
    if ((value.name || props.context) && value.server && value.username && value.password) {
      // Verify Provided Context Configuration.
      const vcenter = new vCenter(value.server, value.username, value.password);
      const vm = await vcenter.ListVM().catch(async (error: ErrorApiGetToken) => {
        await showToast({ title: "vCenter Error:", message: error.message, style: Toast.Style.Failure });
      });
      if (!vm) return;

      if (Context) {
        if (!props.context) {
          Context.push(value as Context);
          await LocalStorage.setItem("context", JSON.stringify(Context));
        }
      } else {
        const context: Context[] = [];
        context.push(value as Context);
        await LocalStorage.setItem("context", JSON.stringify(context));
      }
      if (props.context) await LocalStorage.setItem("context_selected", props.context);
      if (value.name) await LocalStorage.setItem("context_selected", value.name);
      props.SetShowView(false);
    } else {
      await showToast({ title: "Compile all Filed First", style: Toast.Style.Failure });
    }
  }

  const ActionView = (
    <ActionPanel>
      {NameError || ServerError || UsernameError || PasswordError || IsLoadingContext ? null : (
        <Action.SubmitForm onSubmit={Save} />
      )}
      {Context ? <Action title="Close" icon={Icon.Xmark} onAction={() => props.SetShowView(false)} /> : null}
    </ActionPanel>
  );

  return (
    <Form isLoading={IsLoadingContext} actions={ActionView}>
      {!props.context ? (
        <Form.TextField
          id="name"
          title="Name"
          placeholder="context name"
          info={NameInfo}
          error={NameError}
          onChange={DropNameError}
          onBlur={ValidateName}
        />
      ) : null}
      {!props.context || (props.context && Context) ? (
        <Form.TextField
          id="server"
          title="Server"
          placeholder="fqdn or ip"
          info={ServerInfo}
          error={ServerError}
          onChange={DropServerError}
          onBlur={ValidateServer}
          defaultValue={
            props.context && Context
              ? Context.filter((c) => {
                  return c.name === props.context;
                })[0].server
              : undefined
          }
        />
      ) : null}
      {!props.context || (props.context && Context) ? (
        <Form.TextField
          id="username"
          title="Username"
          placeholder="username"
          info={UsernameInfo}
          error={UsernameError}
          onChange={DropUsernameError}
          onBlur={ValidateUsername}
          defaultValue={
            props.context && Context
              ? Context.filter((c) => {
                  return c.name === props.context;
                })[0].username
              : undefined
          }
        />
      ) : null}
      {!props.context || (props.context && Context) ? (
        <Form.PasswordField
          id="password"
          title="Password"
          info={PasswordInfo}
          error={PasswordError}
          onChange={DropPasswordError}
          onBlur={ValidatePassword}
          defaultValue={
            props.context && Context
              ? Context.filter((c) => {
                  return c.name === props.context;
                })[0].password
              : undefined
          }
        />
      ) : null}
    </Form>
  );
}
