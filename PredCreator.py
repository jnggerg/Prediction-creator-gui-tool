import requests 
import json
import tkinter as tk
from tkinter import *
from dotenv import load_dotenv
import os

load_dotenv()
CLIENT_ID = os.getenv("CLIENT_ID")
TOKEN = os.getenv("TOKEN")
BROADCASTER_ID = os.getenv("BROADCASTER_ID")

# headers and url is global since all requests use same headers
headers = {
    "Client-Id": CLIENT_ID,
    "Authorization": f"Bearer {TOKEN}"
}
url = "https://api.twitch.tv/helix/predictions"

def CreatePrediction(title, options, duration): 
        payload = {
            "broadcaster_id": BROADCASTER_ID,  
            "title": title,
            "outcomes": [{"title": option} for option in options],
            "prediction_window": duration
        }
        response = requests.post(url, headers=headers, json=payload).json()

        #add to local db
        prediction = {
            "title": title,
            "option_a": options[0],
            "option_b": options[1],
            "option_c": options[2] if len(options) > 2 else None,
            "duration": duration,
        }
        requests.post("https://localhost:8000/templates", prediction)

        return response

def getCurrentPrediction():
    response = requests.get(url, headers=headers, params={"broadcaster_id": BROADCASTER_ID})
    data = response.json()
    return data

def DeletePrediction(): 
    current_pred = getCurrentPrediction()
    running_pred_id = current_pred["data"][0]["id"]

    url = url + f"broadcaster_id={BROADCASTER_ID}&id={running_pred_id}&status=CANCELED"
    response =requests.patch(url, headers=headers)
    print(response)

def EndPrediction(outcome= None): # choosing outcome

    if outcome is None or outcome < 1 or outcome > 3:
        print(outcome, type(outcome), len(outcome))
        print("No valid outcome given")
        return

    with open('pred_creator_pred.json', "r") as f:
        pred = json.load(f)
    
    predid = pred["data"][0]["id"]
    winning_outcome_id = pred["data"][0]["outcomes"][outcome-1]["id"]

    params = {
        "broadcaster_id": BROADCASTER_ID,
        "id": predid,
        "status": "RESOLVED",
        "winning_outcome_id": winning_outcome_id
    }
    request = requests.patch(url, headers=headers, params=params)
    print(request)

def AddnewPred():
    add_window = tk.Toplevel(gui)
    add_window.title("Add New Prediction")
    add_window.geometry("300x200")

    title_label = Label(add_window, text="Prediction Title:")
    title_label.pack(pady=5)
    title_entry = Entry(add_window)
    title_entry.pack(pady=5)

    options_label = Label(add_window, text="Options (comma separated):")
    options_label.pack(pady=5)
    options_entry = Entry(add_window)
    options_entry.pack(pady=5)

    duration_label = Label(add_window, text="Duration (seconds):")
    duration_label.pack(pady=5)
    duration_entry = Entry(add_window)
    duration_entry.pack(pady=5)

    #pred = Prediction(title=title_entry.get(), outcomes=options_entry.get().split(','))
    submit_button = tk.Button(add_window, text="Submit", command=SelectPred)
    submit_button.pack()
    #add to db of pred templates

def SelectPred(): #listing all existing predictions from db
    preds = requests.get("http://localhost:8000/templates")
    for pred in preds:
        pass

def ManagePredictions():
    pass


if __name__ == "__main__":
    gui = tk.Tk()
    gui.geometry("225x150")
    gui.title("Prediction Creator Tool")

    add_pred_btn = Button(gui, text="Add a new Prediction", command=AddnewPred).grid(row=0, column=0)
    select_pred_btn = Button(gui, text="Select from my predictions", command=SelectPred).grid(row=1, column=0)
    manage_pred_btn = Button(gui, text="Manage my predictions", command=SelectPred).grid(row=2, column=0)

    mainloop()