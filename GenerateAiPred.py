from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, BaseOutputParser
from langchain.prompts import ChatPromptTemplate
from dotenv import load_dotenv
import os
from TwitchApiHandler import GetCurrentGameAndTitle
import json

load_dotenv()
API_KEY = os.getenv("OPENAI_API_KEY")
lang = os.getenv("LANGUAGE")

class OutputParser(BaseOutputParser):
    def parse(self, text:str) -> dict:
        try:
            content = text.strip()

            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip() #remove codeblocks from output
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            parsed_data = json.loads(content)
            return parsed_data

        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw text: {text}")
            return {"data": [], "error": f"Failed to parse JSON: {str(e)}"}
        
        except Exception as e:
            print(f"Unexpected parsing error: {e}")
            return {"data": [], "error": f"Parser error: {str(e)}"}
        
    @property
    def _type(self) -> str:
        return "prediction_json_parser"

chat_model = ChatOpenAI(openai_api_key=API_KEY, model_name="gpt-4o-mini", temperature=0.3)
output_parser = OutputParser() 


def GeneratePredictions():
    template = '''You are an expert at the game given to you. You also are an assistant to a Twitch streamer helping them create good, fun and interactive Twitch predictions
            for their community. Use modern, slang language and create 5 twitch predictions that the streamer could run, use the said game and the title of the stream as context.
            You will be given an input of "game-name, title-of-stream" and only Respond with the predictions title and possible options in a json format, example: {{"data":[{{"title":"prediction1","options":["option1","option2"]}}]}}.
            maximum allowed options is 3, minimum 2. Title length should be a maximum of 45 and options length a maximum of 25 letters each.
            Do not recommend predictions that have nothing to do with said game, use available resources to look into the current state of content in the game and
            study the games rules and gameplay extensively. Dont use options like "Player A" or "Player B" as they are unintuitive for the avarage viewer, especially when there are 5 players on a team for exmaple.
            Most predictions should refer to the outcome of the match / game or the state of the Streamer. 
            '''

    better_context = GetGameContext()

    # replacing curly braces so langchain wont recognize it as var
    safe_context = better_context.replace("{", "{{").replace("}", "}}")

    template += f"\nFor better context, here is some general information regarding the game:\n{safe_context}"

    var_template = "{game}, {title}"

    prompt = ChatPromptTemplate.from_messages([
        ("system", template),
        ("human", var_template)
    ])

    stream_info = GetCurrentGameAndTitle()
    game, title = stream_info["game_name"], stream_info["title"]
    if not game or not title:
        return {"Error": "Could not get Game or Title"}

    chain = prompt | chat_model | output_parser
    result = chain.invoke({"game": game, "title": title})
    return result

def GetGameContext():
    stream_info = GetCurrentGameAndTitle()
    game = stream_info["game_name"]
    template = f'''You are a video game expert. Analyze the game "{game}" and return the most commonly used context clues for Twitch streaming predictions.

        List the details in this readable format (no JSON, no curly braces):

        Game: {game}
        Mechanics:
        - ...
        Common Events:
        - ...
        Items:
        - ...
        Locations:
        - ...
        Player Actions:
        - ...

        Example for Fortnite:
        Game: Fortnite
        Mechanics:
        - building
        - storm circle
        - eliminations
        Common Events:
        - hot drops
        - build fights
        - third parties
        Items:
        - weapons
        - shields
        - materials
        Locations:
        - Tilted Towers
        - Retail Row
        - Storm Eye
        Player Actions:
        - landing
        - looting
        - rotating

        Now analyze: {game}'''

    var_template = "{game}"

    prompt = ChatPromptTemplate.from_messages([
        ("system", template),
        ("human", var_template)
    ])
    chain = prompt | chat_model  # no output_parser here
    result = chain.invoke({"game": game})
    return result.content

def FormatPrediction(pred): #format the prediction to match database format
    if "error" in pred:
        return None
    
    db_predictions = []
    for pred in pred.get("data", []):
        db_pred = {
            "title": pred["title"],
            "option_a": pred["options"][0],
            "option_b": pred["options"][1],
            "option_c": pred["options"][2] if len(pred["options"]) > 2 else None,
            "duration": 90  # Default duration
        }
        db_predictions.append(db_pred)
    
    return db_predictions
