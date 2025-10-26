import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTwitchHandler } from "../utils/TwitchHandler";

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, credentialsReady, settings } = useTwitchHandler();
  //checking timeout - if loading takes more than 3 seconds, that means that credentials are missing
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);

  useEffect(() => {
    if (isReady) {
      setShowLoadingTimeout(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLoadingTimeout(true);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isReady]);

  async function handleTwitchAuth() {
      if (!credentialsReady) {
      return;
    }

    const state = window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

    try {
      await invoke("write_file", { path: ".oauth_state", contents: state });
    } catch (err) {
      console.warn("Failed to persist Twitch OAuth state on disk", err);
    }

    const scope = encodeURIComponent("channel:manage:predictions channel:read:predictions");
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${settings.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(settings.OAUTH_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;

    window.location.replace(authUrl);
  }

  //if credentials are missing, for user to go into settings and add them
  if (!credentialsReady) {
    return (
      <div>
        <p>Loading Twitch credentials…</p>
        {showLoadingTimeout && (
          <div>
            <p>This is taking longer than expected. Please verify your Twitch credentials accordingly</p>
            <p> If you think everything is correct, and you followed the stetup, try restarting the app</p>
            <button onClick={() => navigation("/Settings")}> Go to Settings </button>
          </div>
        )}
      </div>
    );
  }

  if(!isReady) {
    return (
      <div>
        <p>Loading Twitch credentials…</p>
        {showLoadingTimeout && (
          <div>
            <p>Credentials are properly set, please connect your Twitch account to get started.</p>
            <button onClick={() => handleTwitchAuth()}>
              Connect Twitch account
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="container">
      <h1>Twitch Prediction Tool</h1>
      <div className="">
        <button onClick={() => navigation("/CreatePrediction")}>
          Create a new Prediction
        </button>
      </div>
      <div className="">
        <button onClick={() => navigation("/MyPredictions")}>
          My Predictions
        </button>
      </div>
      <div>
        <p>{"Current Predictions:"}</p>
      </div>
      <div>
        <p> Currently connected account: { settings.TWITCH_CHANNEL_NAME} </p>
        <button onClick={() => navigation("/Settings")}> Settings </button>
      </div>
    </main>
  );
}
