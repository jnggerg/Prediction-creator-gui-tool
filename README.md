# Prediction Creator GUI Tool

A simple Python project using a local SQLite database with FastAPI for Twitch streamers and moderators to make creating predictions easier to run and set up.

## Getting Started

### Prerequisites
- Install Python if not already installed

### Setup Instructions

1. **Create a Twitch Developer Application**
   - Go to https://dev.twitch.tv/ and log in with your Twitch account
   - Navigate to https://dev.twitch.tv/console/apps/create and create an app:
     - Enter any name for your application
     - Set the redirect URL to: `https://localhost:5000`
     - Select a random category
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

3. **Run the Application**
   - After setup is complete, run the main application:
     - **Windows**: `py PredCreator.py`
     - **Mac/Linux**: `python3 PredCreator.py`

## Important Notes

⚠️ **For Moderators**: If you are just a moderator for the channel, you need to ask the streamer to run the setup and send you the ".env" file, as this requires Twitch OAuth2, which you need to sign in for to get the needed API token.

## Features

- Save a list of predictions that you wish to run frequently
- Start saved predictions with just a click
- No need to manually type `/prediction` in chat
- No need to repeatedly enter prediction details
- Simple GUI interface for easy management