import subprocess
import sys, time
import requests
from pathlib import Path
import webbrowser
import urllib.parse
import re

'''
Simple setup file for getting Twitch tokens and oauth, downloading dependencies
and updating .env file.
'''


class TwitchAPI():
    def __init__(self, client_id, client_secret, redirect, channel):
        self.channel = channel
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect = redirect
        self.code = ""
        self.token = ""
        self.refresh_token = ""
        self.broadcaster_id = ""
        self.get_authorization_code()
        self.get_user_access_token()
        self.get_broadcaster_id()

    def get_authorization_code(self):
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
        
        print("Opening browser for Twitch authorization...")
        webbrowser.open(url)
        
        print("-"*50)
        print(f"After authorizing, you'll be redirected to: {self.redirect}")
        print("Copy the ENTIRE redirect URL and paste it here.")
        print("Example: http://localhost:3000?code=abc123&scope=...")
        
        while True:
            redirect_url = input("\nPaste the full redirect URL: ").strip()
            
            if not redirect_url:
                print("Please enter a valid URL.")
                continue
                
            code = self.extract_code_from_url(redirect_url)
            if code:
                self.code = code
                print("Successfully extracted authorization code")
                break
            else:
                print("Could not extract authorization code from URL. Make sure you pasted the complete redirect URL without mistakes.")
                continue
    
    def extract_code_from_url(self, url):
        try:
            parsed_url = urllib.parse.urlparse(url)
            query_params = urllib.parse.parse_qs(parsed_url.query)  #parsing url and getting params
            
            code = query_params.get('code')
            if code and len(code) > 0:
                return code[0]  # parse_qs returns lists, so get the first item
            
            #fallback regex extraction if parse fails
            code_match = re.search(r'code=([^&]+)', url)
            if code_match:
                return code_match.group(1)
                
            return None
            
        except Exception as e:
            print(f"Error parsing URL: {e}")
            return None
    
    def get_user_access_token(self):        #get access token from oauth code
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
                refresh_token = token_data.get('refresh_token')
                
                print("-"*50)
                if access_token and refresh_token:
                    print("Access token and refresh token generated successfully!")
                    self.token = access_token
                    self.refresh_token = refresh_token
                    return True
                else:
                    print("Error: Missing access token or refresh token in response")
                    print(f"Response: {token_data}")
                    return False
                    
            except requests.exceptions.RequestException as e:
                print(f"Failed to get access token: {e}")
                return False
        
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

def update_env_file(client_id, client_secret, access_token,refresh_token, channel_name, broadcaster_id, OPENAI_API_KEY = ""):
    env_vars = {
        'TWITCH_CLIENT_ID': client_id,
        'TWITCH_CLIENT_SECRET': client_secret,
        'TWITCH_ACCESS_TOKEN': access_token,
        'TWITCH_REFRESH_TOKEN': refresh_token,
        'TWITCH_CHANNEL_NAME': channel_name,
        'TWITCH_BROADCASTER_ID': broadcaster_id,
        'OPENAI_API_KEY': OPENAI_API_KEY,
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
    
    print("-"*50)
    
    #getting twitch credentials
    client_id = input("Enter your Twitch Client ID: ").strip()
    client_secret = input("Enter you Twitch client secret:").strip()
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
    
    print("-"*50)

    #updating .env
    client = TwitchAPI(client_id, client_secret, redirect, channel)

    use_openai = input("Do you wish to use AI recommended Predicitons for currrently streamed game?: (y/n)").strip()
    if use_openai.lower() == "y":
        OpenAI_KEY = input("Enter you OpenAi API key: ").strip()
        env_success = update_env_file(client_id, client_secret, client.token, client.refresh_token, channel, client.broadcaster_id, OpenAI_KEY)
    else:
        env_success = update_env_file(client_id, client_secret, client.token, channel, client.broadcaster_id)

    if env_success:
        print(".env updated successfully!")
    else:
        print("Setup failed")