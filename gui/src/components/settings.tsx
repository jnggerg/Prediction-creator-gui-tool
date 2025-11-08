import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { stringifyDotEnv } from "../utils/TwitchHandler";
import { useTwitch } from "../utils/TwitchContext";
import AlertMessage from "@/utils/AlertMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup, Field, FieldSet, FieldLabel } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function Settings() {
  const navigate = useNavigate();
  const { settings, setSettings, refresh } = useTwitch();
  const { setStatus, setMessage, DisplayMessage } = AlertMessage();

  return (
    <div className="dark bg-background text-foreground min-h-screen items-center p-5 space-y-5">
      <div className="flex justify-between items-center relative">
        <Button type="button" onClick={() => navigate(-1)}>
          {"⮜ Back"}
        </Button>
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" className="bg-gray-500">
                ?
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              Head over to the Twitch Developer console to get your Client ID
              and Client Secret.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="items-center justify-center space-y-5">
        <DisplayMessage />
        <form
          className=""
          onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            try {
              const envText = stringifyDotEnv(settings);
              await invoke("write_file", { path: ".env", contents: envText });
              setStatus("saved");
              setMessage("Settings saved!");
              // Refresh after a small delay to ensure file write is complete
              setTimeout(() => refresh(), 100);
            } catch (error) {
              console.error("Failed to write file:", error);
              setStatus("error");
              setMessage(`Failed to save: ${error}`);
            }
          }}
        >
          <FieldGroup>
            <FieldSet>
              <Field>
                <FieldLabel>Twitch Client ID</FieldLabel>
                <Input
                  type="text"
                  name="twitchClientId"
                  value={settings.TWITCH_CLIENT_ID}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      TWITCH_CLIENT_ID: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Twitch Client Secret</FieldLabel>
                <Input
                  type="text"
                  name="twitchClientSecret"
                  value={settings.TWITCH_CLIENT_SECRET}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      TWITCH_CLIENT_SECRET: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Twitch Channel Name</FieldLabel>
                <Input
                  type="text"
                  name="twitchChannelName"
                  value={settings.TWITCH_CHANNEL_NAME}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      TWITCH_CHANNEL_NAME: e.target.value,
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Open Ai API key (OPTIONAL)</FieldLabel>
                <Input
                  type="text"
                  name="openAiApiKey"
                  value={settings.OPENAI_API_KEY}
                  onChange={(e) =>
                    setSettings({ ...settings, OPENAI_API_KEY: e.target.value })
                  }
                />
              </Field>
              <div className="w-full max-w-md mx-auto flex justify-center">
                <Button type="submit">Save Settings</Button>
              </div>
            </FieldSet>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
