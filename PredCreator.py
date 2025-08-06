import requests 
import json
import tkinter as tk
from tkinter import *
from dotenv import load_dotenv
import os
import threading
import uvicorn
from dbServer import app

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

        if response.status_code == 200:
            print("Prediction created successfully:", response)

            #add to local db
            prediction = {
                "title": title,
                "option_a": options[0],
                "option_b": options[1],
                "option_c": options[2] if len(options) > 2 else None,
                "duration": duration,
            }
            db_response = requests.post("http://localhost:8000/templates", prediction)
            print("Database response:", db_response.json())
            return response
        else:
            print("Failed to create prediction:", response)
            return None

def getCurrentPrediction():
    response = requests.get(url, headers=headers, params={"broadcaster_id": BROADCASTER_ID})
    data = response.json()
    return data

def DeletePrediction(): 
    current_pred = getCurrentPrediction()
    if not current_pred.get("data"):
        print("No active prediction found")
        return
    
    current_pred_id = current_pred["data"][0]["id"]

    params = {
        "broadcaster_id": BROADCASTER_ID,
        "id": current_pred_id,
        "status": "CANCELED"
    }
    response =requests.patch(url, headers=headers,params=params)
    print(response.status_code, response.text)

def EndPrediction(outcome= None): # choosing outcome
    if outcome is None or outcome < 1 or outcome > 3:
        print("No valid outcome given (0<outcome<4)")
        return
    
    current_pred = getCurrentPrediction()
    if not current_pred.get("data"):
        print("No active prediction found")
        return
    
    pred_data = current_pred["data"][0]
    predid = pred_data["id"]
    
    if outcome > len(pred_data["outcomes"]):
        print(f"Outcome {outcome} doesn't exist for this prediction")
        return
        
    winning_outcome_id = pred_data["outcomes"][outcome-1]["id"]

    params = {
        "broadcaster_id": BROADCASTER_ID,
        "id": predid,
        "status": "RESOLVED",
        "winning_outcome_id": winning_outcome_id
    }
    response = requests.patch(url, headers=headers, params=params)
    print(f"Prediction ended {response.status_code}, {response.text}")

def StartServer():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

class PredictionGUI:
    def __init__(self):
        self.gui = tk.Tk()
        self.gui.geometry("225x150")
        self.gui.title("Prediction Creator Tool")
        self.setup_widgets()

    def setup_widgets(self):
        add_pred_btn = Button(self.gui, text="Add a new Prediction", command=self.AddNewPrediction)
        add_pred_btn.grid(row=0, column=0, padx=10, pady=5)
        select_pred_btn = Button(self.gui, text="Select from my predictions", command=self.SelectPredictions)
        select_pred_btn.grid(row=1, column=0, padx=10, pady=5)
        manage_pred_btn = Button(self.gui, text="Manage my predictions", command=self.ManagePredictions)
        manage_pred_btn.grid(row=2, column=0, padx=10, pady=5)

    def AddNewPrediction(self):
        add_window = tk.Toplevel(self.gui)
        add_window.title("Add New Prediction")
        add_window.geometry("300x200")

        title_label = Label(add_window, text="Prediction Title:")
        title_label.pack(pady=5)
        title_entry = Entry(add_window)
        title_entry.pack(pady=5)

        options_label = Label(add_window, text="Options (comma separated, maximum 3):") 
        options_label.pack(pady=5)
        options_entry = Entry(add_window)
        options_entry.pack(pady=5)

        duration_label = Label(add_window, text="Duration (seconds):")
        duration_label.pack(pady=5)
        duration_entry = Entry(add_window)
        duration_entry.pack(pady=5)

        def submit_prediction():
            try:
                title = title_entry.get().strip()
                options = options_entry.get().strip()
                duration = duration_entry.get().strip()

                if not title:
                    print("Title cannot be empty")
                    return
                if not options:
                    print("Options cannot be empty")
                    return
                
                options = [opt.strip() for opt in options.split(",")][:3] # max 3 options
                if len(options) < 2:
                    print("At least two options are required")
                    return
                if not duration.isdigit() or int(duration) <= 30:
                    print("Duration must be an integer and atleast 30 seconds")
                    return
                
                prediction = {
                    "title": title_entry.get(),
                    "option_a": options[0],
                    "option_b": options[1],
                    "option_c": options[2] if len(options) > 2 else None,
                    "duration": int(duration)
                }

                response = requests.post("http://localhost:8000/templates", json=prediction) #post to database
                if response.status_code == 200:
                    print("Prediction added to database:", response.json())
                else:
                    print("Failed to add prediction to database:", response.text)
                add_window.destroy()
            except Exception as e:
                print("Error submitting prediction:", e)      

        submit_button = tk.Button(add_window, text="Submit", command=submit_prediction)
        submit_button.pack()


    def SelectPredictions(self): #listing all existing predictions from database
        try:
            response = requests.get("http://localhost:8000/templates")
            if response.status_code == 200:
                preds = response.json()
                if not preds:
                    print("No predictions found in the database.")
                    return
                
                select_window = tk.Toplevel(self.gui)
                select_window.title("Select Prediction")
                select_window.geometry("400x300")

                for i, pred in enumerate(preds):
                    text = f"{pred['title']} - {pred['option_a']} | {pred['option_b']}"
                    if pred.get('option_c'):
                        text += f" | {pred['option_c']}"
                    pred_button = Button(select_window, text=text, command=lambda p=pred: self.use_prediction(p))
                    pred_button.pack(padx = 10,pady=5, fill='x')
            else:
                print(f"Error getting prediction templates: {response.status_code}, {response.text}")
        except Exception as e:
            print(f"Error: {e}")

    def ManagePredictions(self):
        pass #to be implemented

    def start(self):
        self.gui.mainloop()

if __name__ == "__main__":
    server_thread = threading.Thread(target=StartServer, daemon=True) #run the server in seperate thread
    server_thread.start()

    app = PredictionGUI()
    app.start()
