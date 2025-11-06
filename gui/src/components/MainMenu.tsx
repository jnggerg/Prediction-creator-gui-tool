import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTwitch } from "../utils/TwitchContext";
import { Prediction, savePrediction } from "../utils/JsonHandler";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import PartnerBadge from "@/components/ui/partnerBadge";

function parseToPrediction(twitchPrediction: any): Prediction {
  const prediction: Prediction = {
    id: twitchPrediction.id,
    title: twitchPrediction.title,
    outcomes: twitchPrediction.outcomes.map((outcome: any) => outcome.title),
    prediction_window: twitchPrediction.prediction_window,
  };
  return prediction;
}

export default function MainMenu() {
  const navigation = useNavigate();
  const {
    isReady,
    credentialsReady,
    settings,
    runningOrLastPrediction,
    cancelPrediction,
    endPrediction,
    streamerData,
    startPrediction,
  } = useTwitch();

  //checking timeout - if loading takes more than 3 seconds, that means that credentials are likely missing
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
    const state =
      window.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

    try {
      await invoke("write_file", { path: ".oauth_state", contents: state });
    } catch (err) {
      console.warn("Failed to persist Twitch OAuth state on disk", err);
    }

    const scope = encodeURIComponent(
      "channel:manage:predictions channel:read:predictions"
    );
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
      settings.TWITCH_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      settings.OAUTH_REDIRECT_URI
    )}&response_type=code&scope=${scope}&state=${state}&force_verify=true`;
    // adding force_verify to params, so user can change account if wanted and
    //  prevents automatic login after disconnecting account, WIP

    window.location.replace(authUrl);
  }

  //if credentials are missing, for user to go into settings and add them
  if (!credentialsReady) {
    return (
      <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-10">
        <p>Loading Twitch credentials…</p>
        {showLoadingTimeout && (
          <div className="flex justify-center items-center flex-col space-y-10">
            <p>
              This is taking longer than expected. Please verify your Twitch
              credentials accordingly
            </p>
            <p>
              {" "}
              If you think everything is correct, and you followed the stetup,
              try restarting the app
            </p>
            <Button onClick={() => navigation("/Settings")}>
              {" "}
              Go to Settings{" "}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-5">
        <p> Loading... ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧</p>
        {showLoadingTimeout && (
          <div className="flex justify-center items-center flex-col space-y-10">
            <p>
              Credentials are properly set, please connect your Twitch account
              to get started.
            </p>
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
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
        <div>
          <Button
            onClick={() => navigation("/Settings")}
            className="bg-red-500"
          >
            <strong>⚙️ Settings</strong>
          </Button>
        </div>
        <h1 className="text-center text-2xl font-bold">
          Twitch Prediction Tool
        </h1>
        <div className="justify-self-end mb-4 rounded-lg border border-purple-700 p-4 text-center shadow space-y-2">
          <p>Connected account:</p>
          <div className="flex items-center justify-center gap-1">
            <img
              src={streamerData.profile_image_url}
              alt={streamerData.display_name}
              width={40}
              height={40}
              className="rounded-full border dark:border-2 border-purple-700"
            />
            {streamerData.display_name}
            {streamerData.broadcaster_type === "partner" && (
              <PartnerBadge size={20} color="#9146FF" />
            )}
          </div>
          <Button>{/*To be implemented*/}Disconnect</Button>
        </div>
      </div>
      <div className="">
        <Button onClick={() => navigation("/CreatePrediction")}>
          <strong>Create a new Prediction</strong>
        </Button>
      </div>
      <div className="">
        <Button onClick={() => navigation("/MyPredictions")}>
          <strong>My Predictions</strong>
        </Button>
      </div>
      <div>
        {(runningOrLastPrediction[0].status === "CANCELED" ||
          runningOrLastPrediction[0].status === "RESOLVED") && (
          <ul>
            <li
              key={runningOrLastPrediction[0].id}
              className="mb-4 p-4 border rounded-lg shadow text-center"
            >
              <p className="text-center">Previous Prediction</p>
              <Separator className="my-2" />
              <strong>{`Title: ${runningOrLastPrediction[0].title}`}</strong>

              {runningOrLastPrediction[0].outcomes &&
                runningOrLastPrediction[0].outcomes.length > 0 && (
                  <ul>
                    {runningOrLastPrediction[0].outcomes.map(
                      (
                        outcome: { id: string; title: string; color: string },
                        idx: number
                      ) => (
                        <li key={outcome.id}>
                          {`Outcome ${idx + 1} -> ${outcome.title}`}
                        </li>
                      )
                    )}
                  </ul>
                )}
              <p>{`Duration: ${runningOrLastPrediction[0].prediction_window} sec`}</p>
              <p>{`Status: ${runningOrLastPrediction[0].status}`}</p>
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  type="button"
                  onClick={() =>
                    startPrediction(
                      parseToPrediction(runningOrLastPrediction[0])
                    )
                  }
                >
                  START AGAIN
                </Button>

                <Button
                  type="button"
                  onClick={() =>
                    savePrediction(
                      parseToPrediction(runningOrLastPrediction[0])
                    )
                  }
                >
                  SAVE
                </Button>
              </div>
            </li>
          </ul>
        )}
        {/* This section is for displaying predictions that are currently running, and can be ended/closed */}
        {(runningOrLastPrediction[0].status === "LOCKED" ||
          runningOrLastPrediction[0].status === "ACTIVE") && (
          <ul>
            <li
              key={runningOrLastPrediction[0].id}
              className="mb-4 p-4 border rounded-lg shadow text-center"
            >
              <p className="text-center">Currently running prediction</p>
              <Separator className="my-2" />
              <strong>{`Title: ${runningOrLastPrediction[0].title}`}</strong>

              {runningOrLastPrediction[0].outcomes &&
                runningOrLastPrediction[0].outcomes.length > 0 && (
                  <ul>
                    {runningOrLastPrediction[0].outcomes.map(
                      (
                        outcome: { id: string; title: string; color: string },
                        idx: number
                      ) => (
                        <li key={outcome.id}>
                          {`Outcome ${idx + 1} -> ${outcome.title}`}
                          <Button
                            onClick={() =>
                              endPrediction(
                                runningOrLastPrediction[0].id,
                                outcome.id
                              )
                            }
                          >
                            End
                          </Button>
                        </li>
                      )
                    )}
                  </ul>
                )}
              <p>{`Duration: ${runningOrLastPrediction[0].prediction_window} sec`}</p>
              <p>{`Status: ${runningOrLastPrediction[0].status}`}</p>
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  type="button"
                  onClick={() =>
                    cancelPrediction(runningOrLastPrediction[0].id)
                  }
                >
                  CANCEL
                </Button>
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
