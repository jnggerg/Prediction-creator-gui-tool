import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTwitchHandler } from "../utils/TwitchHandler";
import { Button } from "@/components/ui/button"

interface DisplayPrediction {
  id: string;
  title: string;
  outcomes: Array<string>;
  duration: number;
}

function parseDisplayPrediction(twitchPrediction: any): DisplayPrediction{
  const displayPrediction : DisplayPrediction = {
    id: twitchPrediction.id,
    title: twitchPrediction.title,
    outcomes: twitchPrediction.outcomes.map((outcome: any) => outcome.title),
    duration: twitchPrediction.prediction_window
  };
  return displayPrediction;
}

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, credentialsReady, settings, runningOrLastPrediction, streamerData, startPrediction } = useTwitchHandler();
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

    //state for csrf
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
      <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-10">
        <p>Loading Twitch credentials…</p>
        {showLoadingTimeout && (
          <div className="flex justify-center items-center flex-col space-y-10">
            <p>This is taking longer than expected. Please verify your Twitch credentials accordingly</p>
            <p> If you think everything is correct, and you followed the stetup, try restarting the app</p>
            <Button onClick={() => navigation("/Settings")}> Go to Settings </Button>
          </div>
        )}
      </div>  
    );
  }

  if (!isReady) {
    return (
      <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-5">
        <p>ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧</p>
        {showLoadingTimeout && (
          <div className="flex justify-center items-center flex-col space-y-10">
            <p>Credentials are properly set, please connect your Twitch account to get started.</p>
            <Button onClick={() => handleTwitchAuth()}>
              Connect Twitch account
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-5">
      <h1>Twitch Prediction Tool</h1>
      <div className="">
        <Button onClick={() => navigation("/CreatePrediction")}>
          Create a new Prediction
        </Button>
      </div>
      <div className="">
        <Button onClick={() => navigation("/MyPredictions")}>
          My Predictions
        </Button>
      </div>
      <div>
       <p>{/*JSON.stringify(runningOrLastPrediction[0])*/}</p>
        {runningOrLastPrediction[0].status === "CANCELED" &&
          <ul>
            <li key={runningOrLastPrediction[0].id} className="mb-4 p-4 border rounded-lg shadow">
              <strong>{`Title: ${runningOrLastPrediction[0].title}`}</strong>

              {runningOrLastPrediction[0].outcomes && runningOrLastPrediction[0].outcomes.length > 0 && (
                <ul>
                  {runningOrLastPrediction[0].outcomes.map((outcome: { id: string; title: string; color: string }, idx: number) => (
                    <li key={outcome.id}>
                      {`Outcome ${idx + 1} -> ${outcome.title}`}
                    </li>
                  ))}
                </ul>
              )}
              <p>{`Duration: ${runningOrLastPrediction[0].prediction_window} sec`}</p>
              <p>{`Status: ${runningOrLastPrediction[0].status}`}</p>

              <Button
                type="button"
                onClick={() => startPrediction(parseDisplayPrediction(runningOrLastPrediction[0]))}
              >
                START AGAIN
              </Button>

              <Button>SAVE</Button>
            </li>
          </ul>
        }
      </div>
      <div>
        <h2> Currently connected account: {settings.TWITCH_CHANNEL_NAME} </h2>
      </div>
      <div>
        <Button onClick={() => navigation("/Settings")} className="bg-red-500"> ⚙️ Settings </Button>
      </div>
    </div>
  );
}
