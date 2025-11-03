import { Prediction } from "./JsonHandler";
import { invoke } from "@tauri-apps/api/core";
import { useState, useEffect, useRef } from "react";

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

interface TokenResponse {
  access_token: string;
  refresh_token: string;
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

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [runningOrLastPrediction, setRunningPrediction] = useState<any>(null);
  const [streamerData, setStreamerData] = useState<any>({});

  useEffect(() => {
    let cancelled = false;

    async function loadEnv() {
      try {
        const data = parseDotEnv(
          await invoke<string>("read_file", { path: ".env" })
        );
        if (!cancelled) {
          let accessToken = data.TWITCH_ACCESS_TOKEN?.trim() ?? "";
          let refreshToken = data.TWITCH_REFRESH_TOKEN?.trim() ?? "";
          let broadcasterId = data.TWITCH_BROADCASTER_ID?.trim() ?? "";
          console.log("Loaded env data:", data);

          if (!accessToken || !refreshToken) {
            console.log(
              "Access or refresh token missing, skipping further setup"
            );
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
            settingsRef.current = nextSettings;
            setSettings(nextSettings);
            return;
          }

          // Fetch broadcaster ID if missing
          if (!broadcasterId) {
            const broadcasterData = await getBroadcasterData(
              data.TWITCH_CHANNEL_NAME,
              data.TWITCH_CLIENT_ID,
              accessToken
            );
            broadcasterId = broadcasterData?.id ?? "";
            setStreamerData(broadcasterData);
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
          settingsRef.current = {
            ...nextSettings,
            TWITCH_BROADCASTER_ID: broadcasterId,
          };

          const predictionData = await getLastPrediction(
            1,
            nextSettings.TWITCH_CLIENT_ID,
            nextSettings.TWITCH_ACCESS_TOKEN,
            nextSettings.TWITCH_BROADCASTER_ID
          );

          //if getLastPrediction updated tokens, persist them here, so we only write to disk once
          nextSettings.TWITCH_ACCESS_TOKEN =
            settingsRef.current.TWITCH_ACCESS_TOKEN;
          nextSettings.TWITCH_REFRESH_TOKEN =
            settingsRef.current.TWITCH_REFRESH_TOKEN;

          if (predictionData) {
            console.log("Fetched last prediction data:", predictionData);
            setRunningPrediction(predictionData);
          }

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
    !!settings.TWITCH_CHANNEL_NAME;

  //checking if all tokens / broadcaster id is set
  const isReady =
    !!credentialsReady &&
    !!settings.TWITCH_ACCESS_TOKEN &&
    !!settings.TWITCH_REFRESH_TOKEN &&
    !!settings.TWITCH_BROADCASTER_ID;

  /* This state is used to poll for the currently running prediction every minute.
Since the App is 100% local in current version, webhooks are not not usable, we need to resort to
polling the Twitch API occasionally to get updates on the running prediction.
*/
  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;
    let intervalId: NodeJS.Timeout;

    const pollPredictions = async () => {
      try {
        const { TWITCH_CLIENT_ID, TWITCH_ACCESS_TOKEN, TWITCH_BROADCASTER_ID } =
          settingsRef.current;

        const predictionData = await getLastPrediction(
          1,
          TWITCH_CLIENT_ID,
          TWITCH_ACCESS_TOKEN,
          TWITCH_BROADCASTER_ID
        );

        if (!cancelled && predictionData) {
          setRunningPrediction(predictionData);
        }
      } catch (err) {
        console.error("Prediction polling failed:", err);
      }
    };

    pollPredictions();
    //polling every minute for a new prediction
    intervalId = setInterval(pollPredictions, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isReady]);

  //wrapper function around invoke to detect 401 errors and refresh tokens, save to env and retry original request
  async function invokeWithRefresh(
    cmd: string,
    argsraw: Record<string, any>
  ): Promise<any> {
    const args = Object.fromEntries(
      Object.entries(argsraw).map(([k, v]) => [
        k,
        Array.isArray(v) ? JSON.stringify(v) : String(v),
      ])
    );

    console.log(cmd, args);
    const raw = await invoke<string>(cmd, { args });
    const result = JSON.parse(raw);
    console.log("Twitch API response:", result);

    if (result?.status === 401) {
      console.log("Access token expired, refreshing tokens");
      const refreshResult = await invoke<TokenResponse>("refresh_tokens_cmd", {
        args: {
          client_id: settingsRef.current.TWITCH_CLIENT_ID,
          client_secret: settingsRef.current.TWITCH_CLIENT_SECRET,
          refresh_token: settingsRef.current.TWITCH_REFRESH_TOKEN,
        },
      });
      console.log(refreshResult);
      try {
        const newAccessToken = refreshResult.access_token;
        const newRefreshToken = refreshResult.refresh_token;
        settingsRef.current = {
          ...settingsRef.current,
          TWITCH_ACCESS_TOKEN: newAccessToken,
          TWITCH_REFRESH_TOKEN: newRefreshToken,
        };
        setSettings({ ...settingsRef.current });

        //retrying original request with new token
        const retryArgs = { ...args, token: newAccessToken };
        const retryRaw = await invoke<string>(cmd, { args: retryArgs });
        return JSON.parse(retryRaw);
      } catch (e) {
        console.error("Failed to parse refresh token response:", e);
        return result;
      }
    }
    return result;
  }

  async function getLastPrediction(
    amount: number,
    client_id: string,
    access_token: string,
    broadcaster_id: string
  ): Promise<any> {
    //any type used temporarily, since twitch apis prediction structure may differ
    if (!amount || !client_id || !access_token || !broadcaster_id) {
      console.error("Missing parameters to get last prediction");
    }
    const resp = await invokeWithRefresh("get_last_predictions_cmd", {
      amount: amount,
      client_id: client_id,
      token: access_token,
      broadcaster_id: broadcaster_id,
    });
    return resp;
  }

  async function getBroadcasterData(
    channelName: string,
    client_id: string,
    access_token: string
  ): Promise<any> {
    if (!channelName || !client_id || !access_token) {
      console.error("Missing parameters to get broadcaster data");
      return {};
    }
    try {
      const resp = await invokeWithRefresh("get_user_data_cmd", {
        client_id: client_id,
        token: access_token,
        username: channelName,
      });
      return resp.data[0] ?? {};
    } catch (err) {
      console.error("Failed to get broadcaster data:", err);
      return {};
    }
  }

  async function startPrediction(prediction: Prediction) {
    if (!prediction.prediction_window) {
      prediction.prediction_window = 90; //default to 90 seconds
    }
    if (!prediction.outcomes || prediction.outcomes.length < 2) {
      console.error(
        "Prediction outcomes missing or too few!",
        prediction.outcomes
      );
      return;
    }
    try {
      console.log("Prediction outcomes before invoking:", prediction.outcomes);
      const response = await invokeWithRefresh("create_twitch_prediction_cmd", {
        client_id: settings.TWITCH_CLIENT_ID,
        client_secret: settings.TWITCH_CLIENT_SECRET,
        token: settings.TWITCH_ACCESS_TOKEN,
        title: prediction.title,
        outcomes: prediction.outcomes,
        prediction_window: prediction.prediction_window,
        broadcaster_id: settings.TWITCH_BROADCASTER_ID,
      });

      const predictionData = await getLastPrediction(
        1,
        settings.TWITCH_CLIENT_ID,
        settings.TWITCH_ACCESS_TOKEN,
        settings.TWITCH_BROADCASTER_ID
      );

      if (predictionData) {
        setRunningPrediction(predictionData);
      }

      //no need to parse again, invokeWithRefresh returnes parsed object
      console.log("Started Twitch prediction:", response);
    } catch (err) {
      console.error("Failed to start Twitch prediction:", err);
    }
  }

  async function endPrediction(id: string, winningOutcomeId: string) {
    if (!id || !winningOutcomeId) {
      console.error("Prediction ID or winning outcome ID missing for ending");
      return;
    }
    try {
      const response = await invokeWithRefresh("end_prediction_cmd", {
        client_id: settings.TWITCH_CLIENT_ID,
        client_secret: settings.TWITCH_CLIENT_SECRET,
        token: settings.TWITCH_ACCESS_TOKEN,
        id: id,
        winning_outcome_id: winningOutcomeId,
        broadcaster_id: settings.TWITCH_BROADCASTER_ID,
      });

      console.log("Ended Twitch prediction:", response);
      setRunningPrediction((prev: any) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], status: "RESOLVED" };
        return updated;
      });
    } catch (err) {
      console.error("Failed to end Twitch prediction:", err);
    }
  }

  async function cancelPrediction(id: string) {
    console.log(id);
    if (!id) {
      console.error("Prediction ID missing for cancellation");
      return;
    }
    try {
      const response = await invokeWithRefresh("cancel_prediction_cmd", {
        client_id: settings.TWITCH_CLIENT_ID,
        client_secret: settings.TWITCH_CLIENT_SECRET,
        token: settings.TWITCH_ACCESS_TOKEN,
        id: id,
        broadcaster_id: settings.TWITCH_BROADCASTER_ID,
      });

      console.log("Cancelled Twitch prediction:", response);

      setRunningPrediction((prev: any) => {
        const updated = [...prev];
        updated[0] = { ...updated[0], status: "CANCELED" };
        return updated;
      });
    } catch (err) {
      console.error("Failed to cancel Twitch prediction:", err);
    }
  }

  return {
    isReady,
    credentialsReady,
    settings,
    setSettings,
    streamerData,
    runningOrLastPrediction,
    startPrediction,
    endPrediction,
    cancelPrediction,
  };
}
