# Prediction Creator GUI Tool

A simple Python project using a local SQLite database with FastAPI and tkinter GUI for Twitch streamers and moderators to make creating predictions easier to run and set up, with optional AI recommendations using Langchain/OpenAI.

## How it works
- init.py installs all the dependencies from requirements.txt, gets Twitch user access token and creates .env file
- PredCreator.py (the main program) starts a uvicorn server hosting the SQLiteDB with SQLAlchemy locally and sets up FastAPI endpoints on a seperate thread (dbServer.py) and launches the tkinter GUI the user can interact with
- TwitchApiHandler.py handles all the interactions with Twitch API, including getting refresh tokens if any request gets a 401 error in response
- GenerateAiPred.py generates 5 recommended predictions with the current game streamed and the title of the stream as context using Langchain/OpenAi

## Getting Started

### Prerequisites
- Install Python and Pip if not already installed
- If using Linux / Mac, setup venv using `python3 -m venv venv`, then run `source venv/bin/activate`

### Setup Instructions

1. **Create a Twitch Developer Application**
   - Go to https://dev.twitch.tv/ and log in with your Twitch account
   - Navigate to https://dev.twitch.tv/console/apps/create and create an app:
     - Enter any name for your application
     - Set the redirect URL to: `https://localhost:5000`
     - Select a category
     - Create the app

2. **Initialize the Application**
   - Run the initialization script:
     - **Windows**: `py init.py`
     - **Mac/Linux**: `python3 init.py`
   - Enter the following information when prompted:
     - Client ID (from your Twitch Developer app)
     - Client Secret (from your Twitch Developer app)
     - Redirect URL (`https://localhost:5000`)
     - Channel name to run predictions on
     - Choose if you want to include AI functionalities (y/n)
        - If yes, enter OpenAI Api key (`https://platform.openai.com/`)

3. **Run the Application**
   - After setup is complete, run the main application:
     - **Windows**: `py PredCreator.py`
     - **Mac/Linux**: `python3 PredCreator.py`

## Important Notes

⚠️ **For Moderators**: If you are just a moderator for the channel, you need to ask the streamer to run the init.py file and send you the ".env" file, as this requires Twitch OAuth2, which you need to sign in for to get the needed API token.

## Features

- Save a list of predictions that you wish to run frequently
- Start saved predictions with just a click
- Get AI created Prediction recommendations
- No need to manually type /prediction in chat
- No need to repeatedly enter prediction details
- Simple GUI interface for easy management using tkinter
