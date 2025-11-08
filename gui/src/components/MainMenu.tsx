import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useTwitch } from "../utils/TwitchContext";
import AccountCard from "@/components/ui/accountCard";
import { Button } from "@/components/ui/button";
import { PrevPredictionDisplay } from "@/components/ui/prevPredictionDisplay";
import { exchangeCodeForTokens, verifyState } from "../utils/OAuthCallback";

export default function MainMenu() {
  const navigation = useNavigate();
  const { isReady, credentialsReady, settings, refresh } = useTwitch();

  //checking timeout - if loading takes more than 2 seconds, that means that credentials are likely missing
  const [showLoadingTimeout, setShowLoadingTimeout] = useState(false);

  useEffect(() => {
    async function startTinyHttp() {
      try {
        await invoke("start_oauth_server");
        console.log("OAuth server started");
      } catch (error) {
        console.error("Failed to start OAuth server:", error);
      }
    }

    startTinyHttp();
  }, []);

  // listening for the OAuth callback from the backend
  useEffect(() => {
    const unlisten = listen<string>("oauth-callback", async (event) => {
      console.log("Received OAuth callback:", event.payload);
      const queryString = event.payload;

      const params = new URLSearchParams(queryString);
      const error = params.get("error");
      const code = params.get("code");
      const returnedState = params.get("state");

      if (error) {
        console.error("Twitch authorization failed:", error);
        return;
      }

      if (!code || !returnedState) {
        console.error("Missing code or state in OAuth callback");
        return;
      }

      if (!(await verifyState(returnedState))) {
        console.error("OAuth state verification failed");
        return;
      }

      await exchangeCodeForTokens(
        code,
        settings.TWITCH_CLIENT_ID,
        settings.TWITCH_CLIENT_SECRET
      );
      refresh();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [refresh, settings]);

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
    const redirectUri = "http://localhost:3000/callback";

    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${
      settings.TWITCH_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&state=${state}&force_verify=true`;
    // adding force_verify to params, so user can change account if wanted

    // create a new Tauri window for OAuth
    const oauthWindow = new WebviewWindow("twitch-oauth", {
      url: authUrl,
      title: "Connect Twitch Account",
      width: 500,
      height: 700,
      center: true,
      resizable: false,
    });

    await oauthWindow.once("tauri://created", () => {
      console.log("OAuth window created");
    });

    await oauthWindow.once("tauri://error", (e) => {
      console.error("Failed to create OAuth window:", e);
    });
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
