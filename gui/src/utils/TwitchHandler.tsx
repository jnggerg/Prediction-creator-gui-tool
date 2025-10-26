import { Prediction } from "./JsonHandler";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect } from "react";

export function parseDotEnv(contents: string): Record<string, string> {
  return contents
    .split(/\r?\n/) //checking for both unix and windows line endings with regex
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")) //ignore comments and empty lines
    .reduce<Record<string, string>>((acc, line) => {
      const [key, ...rest] = line.split("=");
      acc[key] = rest.join("=").trim();
      return acc;
    }, {});
}
export function stringifyDotEnv(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function useTwitchHandler() {
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
          let accessToken = data.TWITCH_ACCESS_TOKEN?.trim() ?? "";
          let refreshToken = data.TWITCH_REFRESH_TOKEN?.trim() ?? "";

          let broadcasterId = data.TWITCH_BROADCASTER_ID?.trim() ?? "";
          let broadcasterData : any = {};
          if (!broadcasterId && accessToken) {
            broadcasterData = await getBroadcasterData(
              data.TWITCH_CHANNEL_NAME,
              data.TWITCH_CLIENT_ID,
              data.TWITCH_CLIENT_SECRET,
              accessToken
            );
            broadcasterId = broadcasterData?.id ?? "";
            console.log(broadcasterData);
            console.log("Fetched broadcaster ID:", broadcasterId);
          }

          const nextSettings = {
            TWITCH_CLIENT_ID: data.TWITCH_CLIENT_ID,
            TWITCH_CLIENT_SECRET: data.TWITCH_CLIENT_SECRET,
            TWITCH_CHANNEL_NAME: data.TWITCH_CHANNEL_NAME,
            OPENAI_API_KEY: data.OPENAI_API_KEY ?? "",
            OAUTH_REDIRECT_URI: "http://localhost:1420/oauth/callback",
            TWITCH_ACCESS_TOKEN: accessToken,
            TWITCH_REFRESH_TOKEN: refreshToken,
            TWITCH_BROADCASTER_ID: broadcasterId,
          };

            setSettings(nextSettings);
            await invoke("write_file", {
              path: ".env",
              contents: stringifyDotEnv(nextSettings),
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

  //checking if the basic credentials are set
  const credentialsReady =
    !!settings.TWITCH_CLIENT_ID &&
    !!settings.TWITCH_CLIENT_SECRET &&
    !!settings.TWITCH_CHANNEL_NAME &&
    !!settings.OAUTH_REDIRECT_URI;

  //checking if all tokens / broadcaster id is set
  const isReady =
    !!credentialsReady &&
    !!settings.TWITCH_ACCESS_TOKEN &&
    !!settings.TWITCH_REFRESH_TOKEN &&
    !!settings.TWITCH_BROADCASTER_ID;


//since the rust backend handles the 401 token refresh, we need to pass the client secret and id along with every request to the backend
async function getBroadcasterData(
  channelName: string,
  client_id: string,
  client_secret: string,
  access_token: string
): Promise<any> {
  if(!channelName || !client_id || !client_secret || !access_token) {
    console.error("Missing parameters to get broadcaster data");
    return {};
  }
  try {
    const resp = await invoke<string>("get_user_id_cmd", {
      clientId: client_id,
      clientSecret: client_secret,
      accessToken: access_token,
      username: channelName,
    });
    const data = JSON.parse(resp);
    return data.data[0] ?? {};
  } catch (err) {
    console.error("Failed to get broadcaster data:", err);
    return {};
  }
}

async function startPrediction(prediction: Prediction) {
  if (!prediction.duration) {
    prediction.duration = 90; //default to 90 seconds
  }
  try {
    const response = await invoke<string>("create_twitch_prediction_cmd", {
      clientId: settings.TWITCH_CLIENT_ID,
      clientSecret: settings.TWITCH_CLIENT_SECRET,
      accessToken: settings.TWITCH_ACCESS_TOKEN,
      title: prediction.title,
      outcomes: prediction.options,
      predictionWindow: prediction.duration,
    });
    const data = JSON.parse(response);

    console.log("Started Twitch prediction:", data.data);
  } catch (err) {
    console.error("Failed to start Twitch prediction:", err);
  }
}

async function endPrediction() {
  // Implementation for ending the prediction
}

async function deletePrediction() {
  // Implementation for deleting the prediction
}

async function getCurrentPredictions() {
  // Implementation for getting current predictions
}
return {
  isReady,
  credentialsReady,
  settings,
  startPrediction,
  endPrediction,
  deletePrediction,
  getCurrentPredictions
}
}
