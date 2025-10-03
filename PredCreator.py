import tkinter as tk
from tkinter import messagebox, Button, Label, Entry, ttk
from dotenv import load_dotenv
import os, time, threading, requests, json
import uvicorn
from dbServer import app
from TwitchApiHandler import *  #all interactions with Twitch API handled in seperate file, see TwitchApiHandler.py
from GenerateAiPred import *    #AI prediction generation handled here with LangChain, see GenerateAiPred.py

'''
This is the main GUI component of the program, that also starts the database server on a seperate thread
'''

load_dotenv()
use_ai = True if os.getenv("OPENAI_API_KEY") else False      #if openai key set, show AI recommend button
DB_URL = "http://localhost:8000/templates"  # URL of the local database server

def validate_prediction_data(title: str, options: List[str], duration:int) -> bool:
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
    
    if isinstance(duration, str) and not duration.isdigit() or int(duration) < 30 or int(duration) > 1800: #same as twitch api
        print("Duration must be an integer and between 30 and 1800 seconds")
        messagebox.showerror("Error", "Duration must be an integer and between 30 and 1800 seconds")
        return False
    
    return True
    
class PredictionGUI:
    def __init__(self):
        self.gui = tk.Tk()
        self.gui.geometry("600x500")
        self.gui.title("Prediction Creator Tool")
        self.setup_widgets()

    def refresh_gui(self): #refresh the GUI so that current / last prediction displays properly
        for widget in self.gui.winfo_children():
            widget.destroy()
        self.setup_widgets()

    def setup_widgets(self):
        add_pred_btn = Button(self.gui, text="Create a new Prediction", command=self.AddNewPrediction)
        add_pred_btn.pack(pady=10)
        select_pred_btn = Button(self.gui, text="Select from my predictions", command=self.SelectPredictions)
        select_pred_btn.pack(pady=10)

        #handling current / last ran prediction buttons
        current_prediction = getCurrentPrediction()
        if not current_prediction: #if no currently running prediction then display last ran prediction with option to re-run
            no_current_prediction = Label(self.gui, text="No Prediction running currently.\n Would like to rerun the previous one?")
            no_current_prediction.pack(pady=10)

            previous_prediction = getLastPrediction()
            t,o,d = previous_prediction["title"],[o["title"] for o in previous_prediction["outcomes"]], previous_prediction["prediction_window"]
            #truncating string and +"..." for readability if more chars in str than 60(optimal visual length for this window size)
            text = f"{t}\n"
            text = text + " | ".join(o)[:57] + f"{"..." if sum(len(s) for s in o) > 60 else ""}"

            def StartAndRefreshGUI(t,o,d):
                CreatePrediction(t, o, d) 
                self.refresh_gui()

            prev_pred_button = Button(self.gui, text=text, command=lambda: StartAndRefreshGUI(t,o,d))
            prev_pred_button.pack(pady=5)

        else: # display running prediction with options to end / delete
            outcomes = current_prediction["outcomes"]
            text = f"Currently Running Prediction:\n Title: {current_prediction["title"]}"
            current_label = Label(self.gui, text=text)
            current_label.pack(pady=10)

            outcome_frame = tk.Frame(self.gui)
            outcome_frame.pack(padx=5)

            def EndAndRefreshGUI(i: int):
                EndPrediction(i)
                self.refresh_gui()

            def DeleteAndRefreshGUI():
                DeletePrediction()
                self.refresh_gui()

            for i,outcome in enumerate(outcomes):
                outcome_button = Button(outcome_frame, text=f"{i+1}",command=lambda i=i: EndAndRefreshGUI(i))
                outcome_button.pack(side=tk.LEFT,padx=5)
            
            delete_button = Button(outcome_frame, text="DEL", command =DeleteAndRefreshGUI)
            delete_button.pack(side=tk.RIGHT,padx=5)

        if use_ai:
            reccommend_ai_predictions = Button(self.gui, text="Would you like to get Ai recommendations? (will take a few seconds)", command=self.GenerateAIPrediction)
            reccommend_ai_predictions.pack(pady=10)
        
    def GenerateAIPrediction(self):
        def CreateAndRefreshGUI(title,options,duration = 90):
            CreatePrediction(title,options,duration)
            ai_window.destroy()
            self.refresh_gui()

        try:
            predictions = GeneratePredictions()

            if not predictions:
                messagebox.showerror("Error:", "Couldnt generate recommended predictions")
                return None
            
            ai_window = tk.Toplevel(self.gui)
            ai_window.title("Generated Predictions")
            ai_window.geometry("400x350")

            for pred in predictions["data"]:
                text = f"{pred["title"]}\n {" | ".join(pred["options"])}"
                generated_pred_button = Button(ai_window, text=text, command=
                lambda t=pred["title"], opts=pred["options"]: CreateAndRefreshGUI(t, opts))
                generated_pred_button.pack(pady=5)

        except Exception as e:
            messagebox.showerror("Error", e)
            return None

    def AddNewPrediction(self): #adding a prediction to database / instantly running new one
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
                duration = duration_entry.get().strip()
                options = [opt.strip() for opt in options_entry.get().split(",")][:10] # max 10 options, rest ignored if more given

                if not duration:
                    duration = 90

                if not validate_prediction_data(title, options, duration):
                    return  
                
                prediction = {
                    "title": title,
                    "options": options, #converted to json by FastAPi automatically
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
            options = [opt.strip() for opt in options_entry.get().strip().split(",")][:10]
            duration = duration_entry.get().strip()
            if not duration:
                duration = 90

            if not validate_prediction_data(title, options, duration):
                return
            CreatePrediction(title, options, duration) #create prediction on twitch
            add_window.destroy()
            self.refresh_gui()

        def StartAndSave():
            title = title_entry.get().strip()
            options = [opt.strip() for opt in options_entry.get().strip().split(",")][:10]
            duration = duration_entry.get().strip()
            if not duration:
                duration = 90
                
            if not validate_prediction_data(title, options, duration):
                return
            CreatePrediction(title, options, duration) #create prediction on twitch

            prediction = {
                "title": title,
                "options": options,
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
            self.refresh_gui()
     
        submit_button = Button(add_window, text="Add to database", command=submit_prediction)
        submit_button.pack(pady=5)
        create_button = Button(add_window, text="Start prediction", command=StartPrediction)
        create_button.pack(pady=5)
        submit_and_create_button = Button(add_window, text="Start and Save to database", command=StartAndSave)
        submit_and_create_button.pack(pady=5)
        
    def DeletePrediction(self, id):
        try:
            response = requests.delete(url=DB_URL + f"/{id}")
            response.raise_for_status()

            messagebox.showinfo("Success", "Prediction Deleted successfully!")
            return True
        except requests.exceptions.HTTPError as e:
            messagebox.showerror("Error","Could not delete prediction from database: {e}")
            return False
    
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
            select_window.geometry("600x500")

            #scrollbar for the menu
            main_frame = tk.Frame(select_window)
            main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

            canvas = tk.Canvas(main_frame)
            scrollbar = tk.Scrollbar(main_frame, orient=tk.VERTICAL, command=canvas.yview)
            
            canvas.configure(yscrollcommand=scrollbar.set)
            
            scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
            canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            
            scrollable_frame = tk.Frame(canvas)
            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")


            #scrollwheel handling win and linux/mac
            def on_mousewheel(event):
                canvas.yview_scroll(int(-1*(event.delta/120)), "units")

            def on_mousewheel_Linux(event):
                if event.num == 4:
                    canvas.yview_scroll(-1,"units")
                elif event.num == 5:
                    canvas.yview_scroll(1, "units")

            canvas.bind("<MouseWheel>", on_mousewheel)
            canvas.bind("<Button-4>", on_mousewheel_Linux) #binding both windows and linux cases
            canvas.bind("<Button-5>", on_mousewheel_Linux)


            #handling focus, so that scrolling in the background wont scroll in the program
            canvas.focus_set()
            def on_enter(event):
                canvas.focus_set()
            def on_leave(event):
                select_window.focus_set()
            canvas.bind("<Enter>", on_enter)
            canvas.bind("<Leave>", on_leave)


            def StartCloseRefreshGUI(title, options, dur): #func only for button
                CreatePrediction(title, options, dur) 
                select_window.destroy()
                self.refresh_gui()

            def DeleteFromDbAndRefresh(pred_id):
                if self.DeletePrediction(pred_id):
                    select_window.destroy()  #refreshes list
                    self.SelectPredictions()  

            #listing all predictions from db
            for i, pred in enumerate(preds):
                displayed_title = pred['title']
                text = f"{displayed_title}\n"
                options = pred['options']

                text = text + " | ".join(options)[:57] + f"{"..." if sum(len(s) for s in options) > 60 else ""}"
                row_frame = tk.Frame(scrollable_frame)
                row_frame.pack(fill='x', padx=10, pady=5)

                pred_button = tk.Button(row_frame, text=text,
                    command=lambda p=pred, opts=options: StartCloseRefreshGUI(p['title'], opts, p['duration']))
                pred_button.pack(side=tk.LEFT,padx=(0,5),expand=True, fill='both')

                delete_pred_btn = tk.Button(row_frame, text="DEL", command= lambda p_id=pred['id']: DeleteFromDbAndRefresh(p_id))
                delete_pred_btn.pack(side=tk.RIGHT,padx=(5,0))

            scrollable_frame.update_idletasks()
            canvas.configure(scrollregion=canvas.bbox("all"))

        except requests.exceptions.RequestException as e:
            messagebox.showerror("Error", f"Failed to connect to server: {e}")
        except Exception as e:
            messagebox.showerror("Error", f"Unexpected error: {e}")

    def start(self):
        self.gui.mainloop()

def StartServer():
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    server_thread = threading.Thread(target=StartServer, daemon=True) #run the server in seperate thread
    server_thread.start()
    time.sleep(1) #wait for server start

    main_app = PredictionGUI()
    main_app.start()
