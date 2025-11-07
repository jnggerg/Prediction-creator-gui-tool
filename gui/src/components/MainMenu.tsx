import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { useTwitch } from "../utils/TwitchContext";
import AccountCard from "@/components/ui/accountCard";
import { Button } from "@/components/ui/button";
import { PrevPredictionDisplay } from "@/components/ui/prevPredictionDisplay";

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, credentialsReady, settings } = useTwitch();

  //checking timeout - if loading takes more than 2 seconds, that means that credentials are likely missing
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);

  useEffect(() => {
    if (isReady) {
      setShowLoadingTimeout(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowLoadingTimeout(true);
    }, 2000);

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

  //if credentials are missing, force user to go into settings and add them
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

  // if tokens are missing, ask user to connect Twitch account
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
            <div>
              <Button
                onClick={() => navigation("/Settings")}
                className="bg-red-500"
              >
                <strong>⚙️ Settings</strong>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen items-center p-5 flex flex-col space-y-2">
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
        <AccountCard />
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
      <PrevPredictionDisplay />
    </div>
  );
}
