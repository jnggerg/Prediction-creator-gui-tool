import { useNavigate } from "react-router-dom";
//import TwitchHandler from "../utils/TwitchHandler";

export default function MainMenu() {
  const navigation = useNavigate();

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
        <p> Currently connected account:</p>
        <button onClick={() => navigation("/Settings")}> Settings </button>
      </div>
    </main>
  );
}
