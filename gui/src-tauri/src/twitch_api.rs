use reqwest::Client;
use serde::Serialize;
use serde_json::Value;
use std::sync::{Arc, Mutex};

#[derive(Serialize, Clone)]
pub struct TwitchPrediction {
    pub title: String,
    pub outcomes: Vec<String>,
    pub prediction_window: u32,
}

pub async fn send_with_refresh<F, Fut>(
    client: &Client,
    mut request_builder: F,
    mut refresh_tokens: impl FnMut() -> Fut,
) -> Result<reqwest::Response, String>
where
    F: FnMut(&Client) -> reqwest::RequestBuilder,
    Fut: std::future::Future<Output = Result<(), String>>,
{
    let resp = request_builder(client).send().await.map_err(|e| e.to_string())?;
    if resp.status() != reqwest::StatusCode::UNAUTHORIZED {
        return Ok(resp);
    }

    refresh_tokens().await?;
    request_builder(client)
        .send()
        .await
        .map_err(|e| e.to_string())
}


pub async fn create_twitch_prediction(
    client_id: String,
    client_secret: String,
    access_token: String,
    prediction: TwitchPrediction,
) -> Result<String, String> {
    let client = Client::new();
    let token_store = Arc::new(Mutex::new(access_token));
    let prediction = Arc::new(prediction);

    let request_token = Arc::clone(&token_store);
    let request_prediction = Arc::clone(&prediction);
    let client_id_clone = client_id.clone();
    let refresh_token_store = Arc::clone(&token_store);

    let response = send_with_refresh(
        &client,
        move |client: &Client| {
            let token_guard = request_token
                .lock()
                .expect("token mutex poisoned");
            client
                .post("https://api.twitch.tv/helix/predictions")
                .header("Client-ID", client_id_clone.clone())
                .bearer_auth(token_guard.as_str())
                .json(&*request_prediction)
        },
        {
            let refresh_client_id = client_id.clone();
            let refresh_client_secret = client_secret.clone();
            move || {
                let token_store = Arc::clone(&refresh_token_store);
                let client_id = refresh_client_id.clone();
                let client_secret = refresh_client_secret.clone();
                async move {
                    let refreshed = get_twitch_tokens(client_id, client_secret).await?;
                    let new_token = extract_access_token(&refreshed)?;

                    {
                        let mut token = token_store
                            .lock()
                            .map_err(|e| e.to_string())?;
                        *token = new_token.clone();
                    }

                    Ok(())
                }
            }
        },
    )
    .await?;

    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?;
    Ok(body)
}

pub async fn get_twitch_tokens(client_id: String, client_secret: String) -> Result<String, String> {
    let client = Client::new();

    let params = [
        ("client_id", client_id.as_str()),
        ("client_secret", client_secret.as_str()),
        ("grant_type", "client_credentials"),
    ];

    let res = client.post("https://id.twitch.tv/oauth2/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(res.text().await.unwrap_or_default())
}

pub async fn get_user_id(
    client_id: String,
    client_secret: String,
    access_token: String,
    username: String,
) -> Result<String, String> {
    let client = Client::new();
    let token_store = Arc::new(Mutex::new(access_token));
    let request_token_store = Arc::clone(&token_store);
    let refresh_token_store = Arc::clone(&token_store);
    let client_id_clone = client_id.clone();
    let client_id_for_refresh = client_id.clone();
    let client_secret_for_refresh = client_secret.clone();
    let username_arc = Arc::new(username);
    let username_for_req = Arc::clone(&username_arc);

    let response = send_with_refresh(
        &client,
        move |client: &Client| {
            let token_guard = request_token_store
                .lock()
                .expect("token mutex poisoned");
            client
                .get("https://api.twitch.tv/helix/users")
                .header("Client-ID", client_id_clone.clone())
                .bearer_auth(token_guard.as_str())
                .query(&[("login", username_for_req.as_ref().as_str())])
        },
        {
            move || {
                let token_store = Arc::clone(&refresh_token_store);
                let client_id = client_id_for_refresh.clone();
                let client_secret = client_secret_for_refresh.clone();
                async move {
                    let refreshed = get_twitch_tokens(client_id, client_secret).await?;
                    let new_token = extract_access_token(&refreshed)?;

                    {
                        let mut token = token_store
                            .lock()
                            .map_err(|e| e.to_string())?;
                        *token = new_token.clone();
                    }

                    Ok(())
                }
            }
        },
    )
    .await?;

    let body = response
        .text()
        .await
        .map_err(|e| e.to_string())?;
    Ok(body)
}

fn extract_access_token(payload: &str) -> Result<String, String> {
    let value: Value = serde_json::from_str(payload).map_err(|e| e.to_string())?;
    value
        .get("access_token")
        .and_then(Value::as_str)
        .map(|s| s.to_owned())
        .ok_or_else(|| "Missing access_token in Twitch response".to_string())
}