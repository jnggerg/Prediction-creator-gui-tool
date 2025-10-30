import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { parseDotEnv, stringifyDotEnv } from "../utils/TwitchHandler";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldSet, FieldLabel  } from "@/components/ui/field"


export function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    TWITCH_CLIENT_ID: "",
    TWITCH_CLIENT_SECRET: "",
    TWITCH_CHANNEL_NAME: "",
    OPENAI_API_KEY: "",
    OAUTH_REDIRECT_URI: "",
    TWITCH_ACCESS_TOKEN: "",
    TWITCH_REFRESH_TOKEN: "",
    TWITCH_BROADCASTER_ID: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEnv() {
      try {
        const data = parseDotEnv(await invoke<string>("read_file", { path: ".env" }));
        if (!cancelled) {
          setSettings({
            TWITCH_CLIENT_ID: data.TWITCH_CLIENT_ID ?? "",
            TWITCH_CLIENT_SECRET: data.TWITCH_CLIENT_SECRET ?? "",
            TWITCH_CHANNEL_NAME: data.TWITCH_CHANNEL_NAME ?? "",
            OPENAI_API_KEY: data.OPENAI_API_KEY ?? "",
            OAUTH_REDIRECT_URI: "http://localhost:1420/oauth/callback",
            TWITCH_ACCESS_TOKEN: data.TWITCH_ACCESS_TOKEN ?? "",
            TWITCH_REFRESH_TOKEN: data.TWITCH_REFRESH_TOKEN ?? "",
            TWITCH_BROADCASTER_ID: data.TWITCH_BROADCASTER_ID ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load env", err);
      }
    }

    loadEnv();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="dark bg-background text-foreground p-5">
      <Button type="button" onClick={() => navigate(-1)}>
        {"⮜ Back"}
      </Button>
      <Button type="button" className="right-0 bg-gray-500"> ? </Button>

      <div className="min-h-screen items-center justify-center space-y-5">  
        <h1>Settings Page</h1>
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault(); 
            const envText = stringifyDotEnv(settings);
            invoke("write_file", { path: ".env", contents: envText });
          }}>
          <FieldGroup>
            <FieldSet>  
          <Field>
            <FieldLabel>Twitch Client ID</FieldLabel>
            <Input
              type="text"
              name="twitchClientId"
              value={settings.TWITCH_CLIENT_ID}
              onChange={(e) =>
                setSettings({ ...settings, TWITCH_CLIENT_ID: e.target.value })
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
              setSettings({ ...settings, TWITCH_CLIENT_SECRET: e.target.value })
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
                setSettings({ ...settings, TWITCH_CHANNEL_NAME: e.target.value })
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
          <Button type="submit" >Save Settings</Button>
          </div>  
          </FieldSet>
          </FieldGroup>
        </form>
      </div>
    </div>
   
  );
}
