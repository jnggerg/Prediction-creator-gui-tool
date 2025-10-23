import json
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List
from dotenv import load_dotenv

'''
This File Handles all the Read / Write logic for the JSON and .env file storage
and is callable via FastAPI endpoints.
Tauris built in read / write system was not flexible enough for this project,
and i wanted to handle all the files in this directory, not through '/appdata/...' or '~/.local/share/...'
'''

app = FastAPI()
origins = ["http://localhost:1420"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

initialData = []
with open("my_predictions.json", "r") as f:
    initialData = json.load(f)

# returns all the saved predictions as list of dicts
@app.get('/predictions')
def load_predictions() -> List[dict]:
    return initialData

# adds new prediction to json
@app.post('/predictions')
def save_prediction(new_prediction: dict) -> None:
    initialData.append(new_prediction)
    with open("my_predictions.json", "w") as f:
        json.dump(initialData, f, indent=2)

# returns all environment variables as dict
@app.get('/env')
def get_env_variables() -> dict:
    load_dotenv()
    env_vars = {key: value for key, value in os.environ.items()}
    return env_vars

# updates all the environment variables 
@app.post('/env')
def set_env_variables(env_vars: dict) -> None:
    # Here you would set the environment variables as needed
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8999)

