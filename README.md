# 🎯 Prediction Creator GUI Tool

A lightweight, **Tauri-based desktop app** for Twitch streamers and moderators who want an easier, faster way to manage Predictions. No more typing `/prediction` in chat!

---

## 🧩 Overview

This tool gives you a **simple, local interface** to start, end, and manage Twitch Predictions efficiently.  
It’s built on [**Tauri**](https://v2.tauri.app/) for minimal performance impact — perfect for streamers who need to keep their system running smoothly.

> ⚠️ **Note:** Everything in this app is **100% local**.  
> You’ll need to use your **own Twitch API credentials** (setup explained below).

---

## ✨ Features

- **Saved Predictions:** Keep a list of your frequently used predictions — stored locally and indefinitely.
- **One-Click Control:** Start or end a prediction instantly, without using Twitch chat commands.
- **Prediction Tracking:** Displays both the **currently running** and **last ran** predictions for quick resolving or restarting.
- **AI-Generated Suggestions** _(optional, WIP)_ — get AI-created prediction ideas.

---

## ⚙️ How It Works

- Built with **Tauri (Rust + React)** for ultra-light performance.
- UI created using **Shadcn components** and **TailwindCSS** for a clean, minimal aesthetic.
- Data saved locally at: C:\Users<USERNAME>\AppData\Roaming\com.TwitchPredictionTool.gui
  Includes:
- `.env` file for Twitch secrets
- `.json` file for saved predictions
- Backend uses **Rust** for:
- File read/write operations
- Twitch API calls
- Hosting a small [tiny_http](https://github.com/tiny-http/tiny-http) server for handling the OAuth2 login flow.

---

## 🧱 Tech Stack

| Layer        | Technology                      |
| ------------ | ------------------------------- |
| Frontend     | React + Shadcn/UI + TailwindCSS |
| Backend      | Rust (Tauri)                    |
| Local Server | tiny_http                       |
| Data Storage | JSON + .env                     |
| Optional AI  | OpenAI API                      |

---

## 🚀 Getting Started

You can download the prebuilt **Windows executable** from the [Releases Page](https://github.com/jnggerg/Prediction-creator-gui-tool/releases/tag/v0.1.0).

> Currently, only **Windows** builds are available.  
> For **Linux**, you’ll need to run the app in development mode (instructions below).

---

## 🛠️ Setup Instructions

### 1. Create a Twitch Developer Application

1. Go to the [Twitch Developer Console](https://dev.twitch.tv/console) and log in with the Twitch account you want to manage predictions for.
2. Click **“Create an Application”**:

- **Name:** Any name you like
- **Redirect URL:**
  ```
  http://localhost:3000/callback
  ```
  ⚠️ _This is important — it’s where OAuth redirects after login. The redirect URI is hardcoded, so not entering this exact one will break the app_
- **Category:** Choose any category
- Click **Create**

---

### 2. Set Up Your Environment

#### Windows (11/10)

- Download and run the `.exe` from the [Releases Page](https://github.com/jnggerg/Prediction-creator-gui-tool/releases/tag/v0.1.0).
- To run in **Dev Mode**, follow the [Tauri setup guide for Windows](https://v2.tauri.app/start/prerequisites/#windows).

#### Linux (Dev Mode Only)

- No prebuilt binaries yet.
- Follow the [Tauri setup guide for Linux](https://v2.tauri.app/start/prerequisites/#linux) to configure your development environment.

---

### 3. Configure App Settings

When you first launch the app, you’ll be asked for the following credentials:

- **Client ID** – from your Twitch Developer App
- **Client Secret** – from your Twitch Developer App
- **Channel Name** – the Twitch channel to manage predictions for
- _(Optional)_ **OpenAI API Key** – for AI-generated prediction ideas  
  → [Get one here](https://platform.openai.com/)

---

### 4. Authenticate via OAuth

After entering your credentials:

1. The app will open a browser window for you to log into Twitch.
2. Once authenticated, the app will receive an OAuth token and you’ll be ready to go.
3. You can later disconnect or switch accounts via the settings menu (requires new Twitch credentials setup).

---

## Notes

### For Moderators

If you’re a moderator and not the channel owner:

- Ask the streamer to log in through the app **once** to authorize your access.
- Or, manually obtain both **access** and **refresh tokens** (with the `manage:predictions` scope) and input them into the app. For this i recommend using the [Twitch token generator](https://twitchtokengenerator.com/)
  _(Simplified setup for moderators is WIP.)_
