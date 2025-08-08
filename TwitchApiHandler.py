from dotenv import load_dotenv
import os, requests
from typing import List
from tkinter import messagebox
import json

load_dotenv()
CLIENT_ID = os.getenv("TWITCH_CLIENT_ID")
TOKEN = os.getenv("TWITCH_ACCESS_TOKEN")
BROADCASTER_ID = os.getenv("TWITCH_BROADCASTER_ID")

headers = {
    "Client-Id": CLIENT_ID,
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
url = "https://api.twitch.tv/helix/predictions"

def CreatePrediction(title: str, options: List[str], duration: int):
        print(f"title: {title}\n options: {options}\n duration: {duration}")
        try:
            payload = {
                "broadcaster_id": BROADCASTER_ID,  
                "title": title,
                "outcomes": [{"title": option} for option in options],
                "prediction_window": duration
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            #print(response.text)
            response.raise_for_status()

            #print("Prediction created successfully:", response)
            messagebox.showinfo("Info", "Prediction successfully started!")
            return response.json()
        
        except requests.exceptions.HTTPError as e:
            messagebox.showerror("Error", e.response.text)
            print("Error creating prediction:", e)
            return None
        
def getCurrentPrediction():
    try:
        response = requests.get(url, headers=headers, params={"broadcaster_id": BROADCASTER_ID}, timeout=10)
        response = response.json()
        most_recent_prediction = response["data"][0]    #request returns all past predictions, in descending chronological order
                                                        #so only need to check status of most recent
        if most_recent_prediction["status"] == "ACTIVE" or most_recent_prediction["status"] == "LOCKED":  
            return most_recent_prediction
        else:
            return {}
        
    except requests.exceptions.RequestException as e:
        print("Error fetching current prediction:", e)
        messagebox.showerror("Error", "Couldnt get current prediction info: {e}")
        return {}

def getLastPrediction():
    try:
        response = requests.get(url, headers=headers, params={"broadcaster_id": BROADCASTER_ID}, timeout=10)
        response = response.json()
        most_recent_prediction = response["data"][0]    #request returns all past predictions, in descending chronological order
        return most_recent_prediction
        
    except requests.exceptions.RequestException as e:
        print("Error fetching current prediction:", e)
        messagebox.showerror("Error", "Couldnt get current prediction info: {e}")
        return {}
    
def DeletePrediction(): 
    current_pred = getCurrentPrediction()
    if not current_pred:
        print("No active prediction found")
        return
    
    current_pred_id = current_pred["data"][0]["id"]

    params = {
        "broadcaster_id": BROADCASTER_ID,
        "id": current_pred_id,
        "status": "CANCELED"
    }
    response =requests.patch(url, headers=headers,params=params, timeout=10)
    print(response.status_code, response.text)

def EndPrediction(outcome: int= None): # choosing outcome
    if outcome is None or outcome < 0 or outcome > 2:
        print("No valid outcome given (0<outcome<4)")
        return
    
    current_pred = getCurrentPrediction()
    if not current_pred:
        print("No active prediction found")
        return
    
    predid = current_pred["id"]
    
    if outcome > len(current_pred["outcomes"]):
        print(f"Outcome {outcome} doesn't exist for this prediction")
        return
        
    winning_outcome_id = current_pred["outcomes"][outcome]["id"]

    params = {
        "broadcaster_id": BROADCASTER_ID,
        "id": predid,
        "status": "RESOLVED",
        "winning_outcome_id": winning_outcome_id
    }
    response = requests.patch(url, headers=headers, params=params, timeout=10)
    print(f"Prediction ended {response.status_code}, {response.text}")

