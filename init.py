# Simple script for setting up the tool
# install dependencies, updates gets a Twitch API token, Broadcaster ID, and updates the .env file

import subprocess
import sys, time
import requests
from pathlib import Path
import webbrowser
import urllib.parse

class TwitchAPI():
    def __init__(self, client_id, client_secret, redirect, channel):
        self.channel = channel
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect = redirect
        self.code = ""
        self.token = ""
        self.broadcaster_id = ""
        self.get_authorization_code()
        self.get_user_access_token()
        self.get_broadcaster_id()

    def get_authorization_code(self):  #getting oauth2 code
        scopes = "channel:read:predictions channel:manage:predictions"
        auth_url = "https://id.twitch.tv/oauth2/authorize"
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect,
            'response_type': 'code',
            'scope': scopes,
            'state': 'predictions_auth'  # CSRF protection
        }
        
        url = f"{auth_url}?{urllib.parse.urlencode(params)}"
        webbrowser.open(url)
        
        print(f"\nAfter authorizing, you'll be redirected to: {self.redirect}")
        print("Copy the 'code' parameter from the URL and paste it here. (from: code=<your_code_here>&...)")
        
        self.code = input("Enter authorization code: ").strip()
        return 
    
    def get_user_access_token(self): #getting access token from auth code

        url = "https://id.twitch.tv/oauth2/token"
        data = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'code': self.code,
            'grant_type': 'authorization_code',
            'redirect_uri': self.redirect
        }
        
        try:
            response = requests.post(url, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            access_token = token_data.get('access_token')
            
            if access_token:
                print("Access token generated")
                self.token = access_token
                return 
            else:
                print("Error: No access token returned")
                return 
                
        except requests.exceptions.RequestException as e:
            print(f"Failed to get access token: {e}")
            return 
        
    def get_broadcaster_id(self):
        url = "https://api.twitch.tv/helix/users"
        headers = {
            'Client-ID': self.client_id,
            'Authorization': f'Bearer {self.token}'
        }
        params = {'login': self.channel.lower()}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            data = response.json()
            users = data.get('data', [])
            
            if users:
                broadcaster_id = users[0]['id']
                print(f"Found broadcaster with the ID: {broadcaster_id}")
                self.broadcaster_id = broadcaster_id
                return 
            else:
                print(f"Channel {self.channel}' not found")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"Failed to get broadcaster ID: {e}")
            return None

def install_requirements(requirements_file="requirements.txt"):
    try:
        print(f"Installing packages from {requirements_file}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_file])
        print("Requirements installed.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def update_env_file(client_id, client_secret, access_token, channel_name, broadcaster_id):
    #set environment variables in .env 
    env_vars = {
        'TWITCH_CLIENT_ID': client_id,
        'TWITCH_CLIENT_SECRET': client_secret,
        'TWITCH_ACCESS_TOKEN': access_token,
        'TWITCH_CHANNEL_NAME': channel_name,
        'TWITCH_BROADCASTER_ID': broadcaster_id
    }
    
    try:
        with open(".env", 'w') as f:
            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")
        return True
    except Exception as e:
        print("Failed to update .env: {e}")
        return False


if __name__ == "__main__":
    #Installing modules
    install_success = install_requirements()
    if not install_success:
        print("Couldnt install requirements. Please check the error above.")
    
    print()
    
    #getting twitch credentials
    client_id = input("Enter your Twitch Client ID: ").strip()
    client_secret = input("Ente you Twitch client secret:").strip()
    redirect = input("Enter your Twitch redirect URL:").strip()
    channel = input("Enter the channel name to run the Tool on:").strip()
    
    if not client_id or not client_secret:
        print("Client ID and Secret are required to run the program")
        time.sleep(1)
        sys.exit()
    if not redirect or not channel:
        print("A redirect URL and Twitch channel name are required to run the program")
        time.sleep(1)
        sys.exit()
    
    client = TwitchAPI(client_id, client_secret, redirect, channel)

    #creating .env
    env_success = update_env_file(client_id, client_secret, client.token, channel, client.broadcaster_id)
    
    if env_success:
        print(".env updated successfully!")
    else:
        print("Setup failed")