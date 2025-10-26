import { useNavigate } from "react-router-dom";
import { useTwitchHandler } from "../utils/TwitchHandler";

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, settings } = useTwitchHandler();

  async function handleTwitchAuth() {
    if (!isReady) {
      return;
    }

    const state = window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    try {
      window.localStorage.setItem("twitch_oauth_state", state);
    } catch (err) {
      console.warn("Failed to persist Twitch OAuth state", err);
    }

    const scope = encodeURIComponent("channel:manage:predictions channel:read:predictions");
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${settings.TWITCH_CLIENT_ID}&redirect_uri=${encodeURIComponent(settings.OAUTH_REDIRECT_URI)}&response_type=code&scope=${scope}&state=${state}`;

    window.location.assign(authUrl);
  }

  if (!isReady) {
    console.log(settings);
    return (
      <div>Loading Twitch credentials…</div>
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
      <button onClick={() => handleTwitchAuth()}>
        Connect Twitch account
      </button>
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
