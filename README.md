# Prediction Creator GUI Tool

A GUI app that gives the Twitch Predictions a better interface than the chat-integrated one provided by Twitch.
The app is built in Tauri (not Electron) for low overhead, with a clean, React-based frontend, styled with Shadcn component and Tailwindcss. All backend functionality (read/write from files, Twitch API calls) is handled with Tauri's built-in Rust backend. Everything is stored 100% locally, so you need to use your own Twitch Developer account for API credentials.

## Features

- Save a list of predictions that you wish to run frequently
- Start saved predictions with just a click
- No need to manually type /prediction in chat and deal with the clunky built-in UI
- End / Delete predictions fast, get up-to-date data on currently running prediction info
- Get AI created Prediction recommendations (optional, WIP)

## How it works
- Currently, the app runs 100% locally, so you have to use your own Twitch API credentials.
- The Frontend is built with React using Typescript, styled with TailWindcss and Shadcn components.
- The program stores the desired prediction templates in a Json file in `/gui/src-tauri/my_predictions.json`, which allows for easy manual editing and better performance then running a local SQL/noSQL db.
- All sensitive information (Twitch clientId, secret, tokens) handled in a .env file inside `/gui/src-tauri/.env`, which you can fill manually or through the app's settings page (tokens get filled on account connect).

## Getting Started
Currently, the program only runs in dev mode, so it requires some basic setup. (nodejs, npm, rust compiler, etc.)
You will also need a Twitch Developer account, since the app is fully local.

### Setup Instructions

1. **Create a Twitch Developer Application**
   - Go to https://dev.twitch.tv/ and log in with your Twitch account (should be the one you wish to run predictions on)
   - Navigate to https://dev.twitch.tv/console/apps/create and create an app:
     - Enter any name for your application (not important)
     - Set the redirect URL to: `http://localhost:1420/oauth/callback` !THIS IS IMPORTANT, SINCE THIS IS THE ENDPOINT THE REDIRECT EXPECTS!
     - Select a category (not important)
     - Create the app

2. **Initialize the Application**
   - Enter the following information in the settings:
     - Client ID (from your Twitch Developer app)
     - Client Secret (from your Twitch Developer app)
     - Channel name to run predictions on (needs to be your own channel, as you will need to login through OAuth2 for tokens)
     - (WIP) Enter OpenAI API key if you want to use AI functionalities (`https://platform.openai.com/`) 
   - Connect your Twitch account when prompted

3. **Setup environment**
   - **Windows**: Setting up Tauri dev on Windows is a bit trickier then linux:
        - Open a PowerShell, and run the setup script: `powershell -ExecutionPolicy Bypass -File .\setup-tauri.ps1`
        - once Visual Studio opens, you will need to select the “Desktop development with C++” workload, and download it manually
        - If this alone does not work, I recommend looking into the Tauri docs to find the exact steps needed for your environment: `https://v2.tauri.app/start/prerequisites/#windows`
          
   - **Linux(deb)**: Tauri install is much easier, but just in case I have provided a bash script that you can execute for simplicity (uses apt):
        - chmod +x setup.sh
        - ./setup.sh
      
4. **Run the Application**
   - After setup is complete, run the main application: (BUNDLING WIP, ONLY DEV BUILD CURRENTLY)
     - **Windows**: npm run tauri dev 
     - **Linux(Deb)**: npm run tauri dev


## Important Notes

⚠️ **For Moderators**: If you are just a moderator for the channel, you will need to ask the streamer to either:
- Login to the app for you
- Manually get both access and refresh tokens with the needed scopes (manage prediction) and send them to you (WIP for easier setup)


