import tkinter as tk
from tkinter import messagebox, Button, Label, Entry, ttk
from dotenv import load_dotenv
import os, time, threading, requests
import uvicorn
from dbServer import app

load_dotenv()
CLIENT_ID = os.getenv("CLIENT_ID")
TOKEN = os.getenv("TOKEN")
BROADCASTER_ID = os.getenv("BROADCASTER_ID")
DB_URL = "http://localhost:8000/templates"  # URL of the local database server

# headers and url is global since all requests use same headers
headers = {
    "Client-Id": CLIENT_ID,
    "Authorization": f"Bearer {TOKEN}"
}
url = "https://api.twitch.tv/helix/predictions"

def validate_prediction_data(title, options, duration) -> bool:
    if not title or len(title) > 45:
        messagebox.showerror("Error", f"Title cannot be empty / exceeds 45 characters")
        return False
    if not options:
        messagebox.showerror("Error", f"Add options")
        return False
    
    if len(options) < 2:
        messagebox.showerror("Error", f"At least two options are required")
        return False
    
    for opt in options:
        if not opt or len(opt) > 25:
            messagebox.showerror("Error", f"Each option must be between 1 and 25 characters")
            return False
    
    if not duration:
        duration = 90 #for validation only, wont get passed back
    elif not duration.isdigit() or int(duration) < 30 or int(duration) > 1800: #same as twitch api
        print("Duration must be an integer and atleast 30 seconds")
        messagebox.showerror("Error", f"Duration must be an integer and between 30 and 1800 seconds")
        return False
    
    return True

def CreatePrediction(title, options, duration):
        try:
            payload = {
                "broadcaster_id": BROADCASTER_ID,  
                "title": title,
                "outcomes": [{"title": option} for option in options],
                "prediction_window": duration
            }
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()

            print("Prediction created successfully:", response)
            return response.json()
        
        except requests.exceptions.RequestException as e:
            print("Error creating prediction:", e)
            return None

def getCurrentPrediction():
    try:
        response = requests.get(url, headers=headers, params={"broadcaster_id": BROADCASTER_ID}, timeout=10)
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print("Error fetching current prediction:", e)
        return {"data": []}

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
    response =requests.patch(url, headers=headers,params=params, timeout=10)
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
    response = requests.patch(url, headers=headers, params=params, timeout=10)
    print(f"Prediction ended {response.status_code}, {response.text}")

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

    def AddNewPrediction(self): #add new prediction to database
        add_window = tk.Toplevel(self.gui)
        add_window.title("Add New Prediction")
        add_window.geometry("400x350")

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
                options = [opt.strip() for opt in options.split(",")][:3] # max 3 options, rest ignored if more given
                
                if not validate_prediction_data(title, options, duration):
                    return  # Validation failed, do not proceed
                
                if not duration:
                    duration = 90
                prediction = {
                    "title": title,
                    "option_a": options[0],
                    "option_b": options[1],
                    "option_c": options[2] if len(options) > 2 else None,
                    "duration": int(duration)
                }

                response = requests.post(DB_URL, json=prediction, timeout=5) #post to database
                if response.status_code == 200:
                    print("Prediction added to database:", response.json())
                    messagebox.showinfo("Success", "Prediction added successfully to database")
                else:
                    print("Failed to add prediction to database:", response.text)
                    messagebox.showerror("Erorr", f"Couldnt add prediction to database:{response.text}")
                add_window.destroy()
            except Exception as e:
                print("Error submitting prediction:", e)
                messagebox.showerror("Error", f"Failed to submit prediction: {e}")

        def StartPrediction():
            title = title_entry.get().strip()
            options = [opt.strip() for opt in options_entry.get().strip().split(",")][:3]
            duration = duration_entry.get().strip()
            if not validate_prediction_data(title, options, duration):
                return
            CreatePrediction(title, options, duration) #create prediction on twitch
            
        submit_button = Button(add_window, text="Add to database", command=submit_prediction)
        submit_button.pack(pady=5)
        create_button = Button(add_window, text="Start prediction", command=StartPrediction)
        create_button.pack(pady=5)


    def SelectPredictions(self): #listing all existing predictions from database
        try:
            response = requests.get(DB_URL, timeout=5)
            response.raise_for_status()  # Raise an error for 4xx/5xx errors
            preds = response.json()

            if not preds:
                messagebox.showinfo("Info", "No predictions found in the database.")
                return
            
            select_window = tk.Toplevel(self.gui)
            select_window.title("Select Prediction")
            select_window.geometry("600x500")  #todo: pagiantion, size option len truncate

            for i, pred in enumerate(preds):
                displayed_title = pred['title'][:30] + "..." if len(pred['title']) > 30 else pred['title']

                text = f"{displayed_title} \n {pred['option_a']} | {pred['option_b']}"

                options = [pred['option_a'], pred['option_b']]
                if pred.get('option_c'): #if option_c doesnt exist .get will return none instead of keyerror
                    text += f" | {pred['option_c']}"
                    options.append(pred['option_c'])

                pred_button = Button(select_window, text=text, 
                command=(lambda p, opts: lambda: CreatePrediction(p['title'], opts, p['duration']))(pred, options))

                pred_button.pack(padx = 10,pady=5, fill='x')

        except requests.exceptions.RequestException as e:
            messagebox.showerror("Error", f"Failed to connect to server: {e}")
        except Exception as e:
            messagebox.showerror("Error", f"Unexpected error: {e}")


    def GenerateAiPrediction(self):
        # Placeholder for AI prediction generation logic
        print("AI prediction generation not implemented yet.")
        messagebox.showinfo("Info", "AI prediction generation is not implemented yet.")

    def ManagePredictions(self):
        pass #to be implemented


    def start(self):
        self.gui.mainloop()

def StartServer():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    server_thread = threading.Thread(target=StartServer, daemon=True) #run the server in seperate thread
    server_thread.start()
    time.sleep(2) #wait for server start

    app = PredictionGUI()
    app.start()
