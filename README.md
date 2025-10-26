# Prediction Creator GUI Tool

A GUI app that gives the Twitch Predictions a better interface than the chat-integrated one provided by Twitch.
The app is built in Tauri (!!not Electron) for low overhead, with React for frontend. All backend functionality (read/write from files, Twitch API calls) is handled with Tauri's built-in Rust backend.

## How it works
- Currently, the app runs 100% locally, so you have to use your own Twitch API credentials.
- The Frontend is built with React using Typescript, styled with TailWindcss and Shadcn components.
- The program stores the desired prediction templates in a Json file in `/gui/src-tauri/my_predictions.json`, which allows for easy manual editing and
  less overhead then running a local SQL db.
- All sensitive information (Twitch clientId, secret, tokens) handled in a .env file inside `/gui/src-tauri/.env`

## Getting Started
The program is bundled into a .exe file for ease of use for the avarage person, however you can also run it in dev mode if you like,
but on Windows it requires a painful setup, so in that case running it on Linux / in WSL is definitely recommended.

### Setup Instructions

1. **Create a Twitch Developer Application**
   - Go to https://dev.twitch.tv/ and log in with your Twitch account
   - Navigate to https://dev.twitch.tv/console/apps/create and create an app:
     - Enter any name for your application (not important)
     - Set the redirect URL to: `https://localhost:1420/oauth/callback` !THIS IS IMPORTANT, SINCE THE PROGRAM RUNS 100% LOCAL
     - Select a category (not important)
     - Create the app

2. **Initialize the Application**
   - Enter the following information when prompted:
     - Client ID (from your Twitch Developer app)
     - Client Secret (from your Twitch Developer app)
     - Redirect URL (`https://localhost:1420/oauth/callback`)
     - Channel name to run predictions on (needs to be your own channel)
     - Enter OpenAI API key if you want to use AI functionalities (`https://platform.openai.com/`) 

3. **Run the Application**
   - After setup is complete, run the main application:
     - **Windows**: run PredictionTool.exe
     - **Linux(Deb)**: run PredictionTool.deb (currently only for Debian-based distros)

### Running in dev mode
- **Linux**: install npm (sudo apt install npm), and install Tauri
- **On Windows**, setting it up for development is much more complicated, since Windows does not manually include a rust compiler.

## Important Notes

⚠️ **For Moderators**: If you are just a moderator for the channel, you need to ask the streamer to run the init.py file and send you the ".env" file, as this requires Twitch OAuth2, which you need to sign in for to get the needed API token.

## Features

- Save a list of predictions that you wish to run frequently
- Start saved predictions with just a click
- Get AI created Prediction recommendations
- No need to manually type /prediction in chat and deal with the clunky built-in UI.
- No need to repeatedly enter prediction details
- Simple GUI interface for easy management using tkinter
