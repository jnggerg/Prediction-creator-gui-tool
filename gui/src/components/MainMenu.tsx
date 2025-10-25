import { useNavigate } from "react-router-dom";
import { useTwitchHandler } from "../utils/TwitchHandler";
//import TwitchHandler from "../utils/TwitchHandler";

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, settings } = useTwitchHandler();

  return !isReady ? (
    <div>Loading Twitch credentials…</div>
  ) : (
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
