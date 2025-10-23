import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useState, useEffect } from "react";

export function Settings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    twitchClientId: "",
    twitchClientSecret: "",
    twitchChannelName: "",
    openAiApiKey: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadEnv() {
      try {
        const { data } = await axios.get("http://localhost:8999/env");
        if (!cancelled) {
          setSettings({
            twitchClientId: data.twitchClientId ?? "",
            twitchClientSecret: data.twitchClientSecret ?? "",
            twitchChannelName: data.twitchChannelName ?? "",
            openAiApiKey: data.openAiApiKey ?? "",
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
            const form = e.currentTarget;
            const formData = new FormData(form);
            axios.post("http://localhost:8999/env", {
              twitchClientId: (formData.get("twitchClientId") ?? "").toString(),
              twitchClientSecret: (
                formData.get("twitchClientSecret") ?? ""
              ).toString(),
              twitchChannelName: (
                formData.get("twitchChannelName") ?? ""
              ).toString(),
              openAiApiKey: (formData.get("openAiApiKey") ?? "").toString(),
            });
          }}
        >
          <input
            type="text"
            name="twitchClientId"
            value={settings.twitchClientId}
            onChange={(e) =>
              setSettings({ ...settings, twitchClientId: e.target.value })
            }
          />
          <input
            type="text"
            name="twitchClientSecret"
            value={settings.twitchClientSecret}
            onChange={(e) =>
              setSettings({ ...settings, twitchClientSecret: e.target.value })
            }
          />
          <input
            type="text"
            name="twitchChannelName"
            value={settings.twitchChannelName}
            onChange={(e) =>
              setSettings({ ...settings, twitchChannelName: e.target.value })
            }
          />
          <input
            type="text"
            name="openAiApiKey"
            value={settings.openAiApiKey}
            onChange={(e) =>
              setSettings({ ...settings, openAiApiKey: e.target.value })
            }
          />
          <button type="submit">Save Settings</button>
        </form>
      </div>
    </div>
  );
}
