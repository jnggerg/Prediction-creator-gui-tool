import { Prediction, axiosClient } from "./JsonHandler";
import axios, { AxiosInstance } from "axios";

const envs = await axiosClient.get<{ [key: string]: string }>(`/env`);
console.log("Loaded env variables:", envs.data);

const axiosTwitchClient: AxiosInstance = axios.create({
  baseURL: "https://api.twitch.tv/helix/predictions",
  timeout: 1000,
  headers: {
    "Client-ID": envs.data["TWITCH_CLIENT_ID"],
    Authorization: `Bearer ${envs.data["TWITCH_ACCESS_TOKEN"]}`,
    "Content-Type": "application/json",
  },
});

const axiosTwitchAuthClient: AxiosInstance = axios.create({
  baseURL: "https://id.twitch.tv/oauth2",
  timeout: 1000,
  headers: {
    "Client-ID": envs.data["TWITCH_CLIENT_ID"],
    "Content-Type": "application/json",
  },
});

async function refreshTwitchToken() {
  try {
    const response = await axiosTwitchAuthClient.post(`/token`, {
      client_id: envs.data["TWITCH_CLIENT_ID"],
      client_secret: envs.data["TWITCH_CLIENT_SECRET"],
      grant_type: "refresh_token",
      refresh_token: envs.data["TWITCH_REFRESH_TOKEN"],
    });
    const data = response.data;
    console.log("Refreshed Twitch token:", data);

    envs.data["TWITCH_ACCESS_TOKEN"] = data.access_token;
    envs.data["TWITCH_REFRESH_TOKEN"] = data.refresh_token;

    await axiosClient.post(`/env`, envs.data);

    console.log("Refreshed tokens, saved to env variables");
  } catch (err) {
    console.error("Failed to refresh Twitch token:", err);
  }
}

// wrapper around axios to handle 401 errors by refreshing token
async function makeAuthenticatedRequest<T>(
  request: () => Promise<T>
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      await refreshTwitchToken();
      axiosTwitchClient.defaults.headers.common.Authorization = `Bearer ${envs.data["TWITCH_ACCESS_TOKEN"]}`;

      return await request();
    }

    throw error;
  }
}

export async function startPrediction(prediction: Prediction) {
  if (!prediction.duration) {
    prediction.duration = 90; //default to 90 seconds
  }
  try {
    const response = await makeAuthenticatedRequest(() =>
      axiosTwitchClient.post(``, {
        broadcaster_id: envs.data["TWITCH_BROADCASTER_ID"],
        title: prediction.title,
        outcomes: prediction.options?.map((option) => ({
          title: option,
        })),
        prediction_window: prediction.duration,
      })
    );
    console.log("Started Twitch prediction:", response.data);
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

export default {
  startPrediction,
  endPrediction,
  deletePrediction,
  getCurrentPredictions,
};
