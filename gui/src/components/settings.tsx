import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";
import { parseDotEnv, stringifyDotEnv } from "../utils/TwitchHandler";


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
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        {"<- "}
      </button>
      <h1>Settings Page</h1>

      <div>
        <form
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const envText = stringifyDotEnv(settings);
            invoke("write_file", { path: ".env", contents: envText });
          }}>
          <p>Twitch Client ID</p>
          <input
            type="text"
            name="twitchClientId"
            value={settings.TWITCH_CLIENT_ID}
            onChange={(e) =>
              setSettings({ ...settings, TWITCH_CLIENT_ID: e.target.value })
            }
          />
          <p>Twitch Client Secret</p>
          <input
            type="text"
            name="twitchClientSecret"
            value={settings.TWITCH_CLIENT_SECRET}
            onChange={(e) =>
              setSettings({ ...settings, TWITCH_CLIENT_SECRET: e.target.value })
            }
          />
          <p>Twitch Channel Name</p>
          <input
            type="text"
            name="twitchChannelName"
            value={settings.TWITCH_CHANNEL_NAME}
            onChange={(e) =>
              setSettings({ ...settings, TWITCH_CHANNEL_NAME: e.target.value })
            }
          />
          <p>Open Ai API key (OPTIONAL)</p>
          <input
            type="text"
            name="openAiApiKey"
            value={settings.OPENAI_API_KEY}
            onChange={(e) =>
              setSettings({ ...settings, OPENAI_API_KEY: e.target.value })
            }
          />
          <button type="submit">Save Settings</button>
        </form>
      </div>
    </div>
  );
}
