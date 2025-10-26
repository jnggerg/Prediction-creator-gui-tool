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
          // cannot start without these credentials
          if(!data.TWITCH_CLIENT_ID || !data.TWITCH_CLIENT_SECRET || !data.TWITCH_CHANNEL_NAME || !data.OAUTH_REDIRECT_URI) {
            console.error("Twitch credentials, channel, or redirect URI missing in .env file");
            return;
          }

          let accessToken = data.TWITCH_ACCESS_TOKEN?.trim() ?? "";
          let refreshToken = data.TWITCH_REFRESH_TOKEN?.trim() ?? "";

          if (!accessToken || !refreshToken) {
            console.log("Twitch access or refresh token missing, fetching new tokens");
            const fetchedTokens = await getTwitchAccessTokens(
              data.TWITCH_CLIENT_ID,
              data.TWITCH_CLIENT_SECRET
            );

            if (fetchedTokens.length < 2) {
              console.error("Failed to obtain Twitch access and refresh tokens");
              return;
            }

            accessToken = fetchedTokens[0];
            refreshToken = fetchedTokens[1];
          }

          let broadcasterId = data.TWITCH_BROADCASTER_ID?.trim() ?? "";
          let broadcasterData : any = {};
          if (!broadcasterId && accessToken) {
            broadcasterData = await getBroadcasterData(
              data.TWITCH_CHANNEL_NAME,
              data.TWITCH_CLIENT_ID,
              data.TWITCH_CLIENT_SECRET,
              accessToken
            );
            broadcasterId = broadcasterData.id;
          }

          const nextSettings = {
            TWITCH_CLIENT_ID: data.TWITCH_CLIENT_ID,
            TWITCH_CLIENT_SECRET: data.TWITCH_CLIENT_SECRET,
            TWITCH_CHANNEL_NAME: data.TWITCH_CHANNEL_NAME,
            OPENAI_API_KEY: data.OPENAI_API_KEY ?? "",
            OAUTH_REDIRECT_URI: data.OAUTH_REDIRECT_URI,
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

  const isReady =
    !!settings.TWITCH_CLIENT_ID &&
    !!settings.TWITCH_CLIENT_SECRET &&
    !!settings.TWITCH_CHANNEL_NAME &&
    !!settings.TWITCH_ACCESS_TOKEN &&
    !!settings.TWITCH_BROADCASTER_ID;


//since the rust backend handles the 401 token refresh, we need to pass the client secret and id along with every request to the backend
async function getBroadcasterData(
  channelName: string,
  client_id: string,
  client_secret: string,
  access_token: string
): Promise<any> {
  try {
    const resp = await invoke<string>("get_user_id_cmd", {
      clientId: client_id,
      clientSecret: client_secret,
      accessToken: access_token,
      username: channelName,
    });
    const data = JSON.parse(resp);
    return data.data[0] ?? "error";
  } catch (err) {
    console.error("Failed to get broadcaster data:", err);
    return "error";
  }
}

async function getTwitchAccessTokens(
  clientID: string,
  clientSecret: string
): Promise<Array<string>> {
  try {
    const response = await invoke<string>("get_twitch_tokens_cmd", {
      clientId: clientID,
      clientSecret: clientSecret,
    });
    const data = JSON.parse(response);
    console.log("Obtained Twitch access token:", data);

    return [data.access_token, data.refresh_token];
  } catch (err) {
    console.error("Failed to obtain Twitch access token:", err);
    return [];
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
  settings,
  startPrediction,
  endPrediction,
  deletePrediction,
  getCurrentPredictions
}
}
