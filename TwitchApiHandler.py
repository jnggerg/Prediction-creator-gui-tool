from dotenv import load_dotenv
import os, requests
from typing import List
from tkinter import messagebox
import json
from init import update_env_file

'''
This file handles interacting with Twitch, and handling refresh tokens
'''

load_dotenv()
CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
CLIENT_SECRET = os.getenv("TWITCH_CLIENT_SECRET")
TOKEN = os.getenv("TWITCH_ACCESS_TOKEN")
REFRESH_TOKEN = os.getenv("TWITCH_REFRESH_TOKEN")
BROADCASTER_ID, CHANNEL = os.getenv("TWITCH_BROADCASTER_ID"), os.getenv("TWITCH_CHANNEL_NAME")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

#global API header and url since all calls use the same endpoint
headers = {
    "Client-Id": CLIENT_ID,
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
url = "https://api.twitch.tv/helix/predictions"

def refresh_access_token():
    global TOKEN, REFRESH_TOKEN, headers
    url = "https://id.twitch.tv/oauth2/token"
    data = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'grant_type': 'refresh_token',
        'refresh_token': REFRESH_TOKEN
    }
    
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        
        token_data = response.json()
        new_access_token = token_data.get('access_token')
        new_refresh_token = token_data.get('refresh_token')
        
        if new_access_token:
            print("Access token refreshed successfully!")
            TOKEN = new_access_token
            #update refresh token if a new one is provided
            if new_refresh_token:
                REFRESH_TOKEN = new_refresh_token
            headers["Authorization"] = f"Bearer {TOKEN}"
            update_env_file(CLIENT_ID,CLIENT_SECRET, TOKEN, REFRESH_TOKEN,CHANNEL, BROADCASTER_ID,OPENAI_API_KEY)
            return True
        else:
            print("Error: No new access token returned")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"Failed to refresh access token: {e}")
        return False

def MakeAuthenticatedRequest(method, url, **kwargs): #wrapper function handling 401 errors by retrying with refreshed token
    try:
        response = requests.request(method, url, headers=headers, **kwargs)
        
        # If we get a 401, try to refresh token and retry once
        if response.status_code == 401:
            print("Received 401 error, attempting to refresh token...")
            if refresh_access_token():
                print("Token refreshed, retrying request...")
                # Retry the request with the new token
                response = requests.request(method, url, headers=headers, **kwargs)
            else:
                print("Failed to refresh token")
                
        response.raise_for_status()
        return response
        
    except requests.exceptions.RequestException as e:
        raise e



def CreatePrediction(title: str, options: List[str], duration: str ):
        print(f"title: {title}\n options: {options}\n duration: {duration}")
        try:
            payload = {
                "broadcaster_id": BROADCASTER_ID,  
                "title": title,
                "outcomes": [{"title": option} for option in options],
                "prediction_window": duration
            }
            response = MakeAuthenticatedRequest("POST", url, json=payload, timeout=10)

            print("Prediction created successfully:", response)
            messagebox.showinfo("Info", "Prediction successfully started!")
            return response.json()
        
        except requests.exceptions.HTTPError as e:
            messagebox.showerror("Error", e.response.text)
            print("Error creating prediction:", e)
            return None
        
def getCurrentPrediction(): #used to return the "ACTIVE" / "LOCKED" prediction (which is always the most recent, since there cant be 2 unclosed predictions
    try:
        response = MakeAuthenticatedRequest("GET", url, params={"broadcaster_id": BROADCASTER_ID}, timeout=10)
        response = response.json()
        
        if not response["data"]:
            return {}
        
        most_recent_prediction = response["data"][0]    #request returns all past predictions, in descending chronological order
        if most_recent_prediction["status"] == "ACTIVE" or most_recent_prediction["status"] == "LOCKED":    
            return most_recent_prediction
        else:
            return {}
        
    except requests.exceptions.RequestException as e:
        print("Error fetching current prediction:", e)
        messagebox.showerror("Error", f"Couldnt get current prediction info: {e}")
        return {}

def getLastPrediction(): #used to returned last CLOSED prediction
    try:
        response = MakeAuthenticatedRequest("GET", url, params={"broadcaster_id": BROADCASTER_ID}, timeout=10)
        response = response.json()

        if not response["data"]:
            return {}

        most_recent_prediction = response["data"][0]
        return most_recent_prediction
        
    except requests.exceptions.RequestException as e:
        print("Error fetching current prediction:", e)
        messagebox.showerror("Error", f"Couldnt get current prediction info: {e}")
        return {}
    
def DeletePrediction():
    try:
        current_pred = getCurrentPrediction()
        if not current_pred:
            print("No active prediction found")
            return
        
        current_pred_id = current_pred["id"]

        params = {
            "broadcaster_id": BROADCASTER_ID,
            "id": current_pred_id,
            "status": "CANCELED"
        }
        response = MakeAuthenticatedRequest("PATCH", url, params=params, timeout=10)

        print(response.status_code)
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Couldnt delete prediction: {e}")

def EndPrediction(outcome: int= None): # choosing winning outcome
    try:
        if outcome is None or outcome < 0 or outcome > 9:
            print("No valid outcome given (0<outcome<4)")
            return
        
        current_pred = getCurrentPrediction()
        if not current_pred:
            print("No active prediction found")
            return
        
        if outcome > len(current_pred["outcomes"]):
            print(f"Outcome {outcome} doesn't exist for this prediction")
            return
            
        winning_outcome_id = current_pred["outcomes"][outcome]["id"]
        predid = current_pred["id"]
        params = {
            "broadcaster_id": BROADCASTER_ID,
            "id": predid,
            "status": "RESOLVED",
            "winning_outcome_id": winning_outcome_id
        }
        response = MakeAuthenticatedRequest("PATCH", url, params=params, timeout=10)

        print(f"Prediction ended {response.status_code}")
    except requests.exceptions.RequestException as e:
        messagebox.showerror("Error", f"Couldnt delete prediction: {e}")
    

def GetCurrentGameAndTitle():
    channel_url = "https://api.twitch.tv/helix/channels"
    params = {"broadcaster_id": BROADCASTER_ID}
    
    try:
        response = MakeAuthenticatedRequest("GET", channel_url, params=params, timeout=10)
        data = response.json()
        
        if data["data"]:
            channel = data["data"][0]
            return {
                "game_name": channel["game_name"],  
                "title": channel["title"]
            }
        return None
        
    except requests.exceptions.RequestException as e:
        print("Error fetching channel info:", e)
        return None