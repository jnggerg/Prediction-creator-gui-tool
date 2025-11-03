use reqwest::Client;
use serde::{Serialize, Deserialize};
use serde_json::json;
use serde_json::Value;
use urlencoding::encode;

#[derive(Serialize, Clone)]
pub struct TwitchPrediction {
    pub title: String,
    pub outcomes: Vec<Outcome>,
    pub prediction_window: u32,
    pub broadcaster_id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Outcome {
    pub title: String,
}

/*
Twitch API error response shape
{  
    "error": "<Error Type>",
    "status": <HTTP status code>,
    "message": "<Human-readable error message>"
}
Twitch API successful response shape
{ 
    "data": [...]
}  

*/



pub async fn refresh_tokens(
    client_id: String,
    client_secret: String,
    refresh_token: String,
) -> Result<TokenResponse, String> {
    let encoded_refresh_token = encode(&refresh_token);
    let payload = [
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("grant_type", "refresh_token"),
        ("refresh_token", encoded_refresh_token.as_ref()),
    ];
    let client = Client::new();
    let response = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let text = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(text.to_string());
    }
    let tokens: TokenResponse = serde_json::from_str(&text).map_err(|e| e.to_string())?;

    Ok(tokens)
}


pub async fn create_twitch_prediction(
    client_id: String,
    access_token: String,
    prediction: TwitchPrediction,
) -> Result<String, String> {
    let client = Client::new();

    let response = client
        .post("https://api.twitch.tv/helix/predictions")
        .header("Client-ID", client_id.as_str())
        .bearer_auth(access_token.as_str())
        .json(&prediction)
        .send()
        .await
        .map_err(|e| e.to_string())?;


    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(body);
    }
    Ok(body)
}

pub async fn get_user_data(
    client_id: String,
    access_token: String,
    username: String,
) -> Result<String, String> {
    let client = Client::new();

    let response = client
        .get("https://api.twitch.tv/helix/users")
        .header("Client-ID", client_id.as_str())
        .bearer_auth(access_token.as_str())
        .query(&[("login", username.as_str())])
        .send()
        .await
        .map_err(|e| e.to_string())?;


    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(body);
    }
    Ok(body)
}


pub async fn get_last_predictions(
    amount: u32,
    client_id: String,
    token: String,
    broadcaster_id: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let response = client
        .get("https://api.twitch.tv/helix/predictions")
        .bearer_auth(token)
        .header("Client-Id", client_id)
        .query(&[("broadcaster_id", broadcaster_id.as_str())])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status(); 

    // returning the 401 as an Ok(), so that we can refresh token without triggering the catch block
    if status == 401 { 
        return Ok(response.text().await.map_err(|e| e.to_string())?.to_string());
    }
    if !status.is_success() {
        return Err(response.text().await.map_err(|e| e.to_string())?.to_string());
    }
    let text = response.text().await.map_err(|e| e.to_string())?;
    let data: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    
    // parse data into array
    let predictions_vec = data.get("data")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default();

    
    let first_n: Vec<Value> = predictions_vec.into_iter().take(amount as usize).collect();
    println!("First N Predictions: {:?}", first_n);
    if first_n.is_empty() { // ensure that the returned Err() is also structured as a JSON so parsing wont break
        return Err("{\"error\": \"No predictions found, returned vector is empty.\"}".to_string());
    }

    // Convert back to JSON string
    Ok(serde_json::to_string(&first_n).map_err(|e| e.to_string())?)
}

pub async fn exchange_code_for_tokens(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<String, String> {
    let client = Client::new();

    let params = [
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("code", code.as_str()),
        ("grant_type", "authorization_code"),
        ("redirect_uri", redirect_uri.as_str()),
    ];

    let response = client
        .post("https://id.twitch.tv/oauth2/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(body.to_string());
    }

    Ok(body)
}

pub async fn cancel_prediction(
    client_id: String,
    access_token: String,
    broadcaster_id: String,
    id: String,
) -> Result<String, String> {
    let client = Client::new();

    let url = "https://api.twitch.tv/helix/predictions";

    let payload = json!({
        "broadcaster_id": broadcaster_id,
        "id": id,
        "status": "CANCELED"
    });

    let response = client
        .patch(url)
        .header("Client-ID", &client_id)
        .bearer_auth(&access_token)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("{}: {}", status, body));
    }

    Ok(body)
}

pub async fn end_prediction(
    client_id: String,
    access_token: String,
    broadcaster_id: String,
    id: String,
    winning_outcome_id: String,
) -> Result<String, String> {
    let client = Client::new();

    let url = "https://api.twitch.tv/helix/predictions";

    let payload = json!({
        "broadcaster_id": broadcaster_id,
        "id": id,
        "status": "RESOLVED",
        "winning_outcome_id": winning_outcome_id
    });

    let response = client
        .patch(url)
        .header("Client-ID", &client_id)
        .bearer_auth(&access_token)
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let body = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(format!("{}: {}", status, body));
    }

    Ok(body)
}