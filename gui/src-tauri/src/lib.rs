mod twitch_api;
use serde_json;
use std::collections::HashMap;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_twitch_prediction_cmd(args: HashMap<String, String>) -> Result<String, String> {
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let access_token = args.get("token").cloned().unwrap_or_default();
    let title = args.get("title").cloned().unwrap_or_default();
    let broadcaster_id = args.get("broadcaster_id").cloned().unwrap_or_default();

    // Parse comma-separated options into Vec<Outcome>
    let outcomes_json = args.get("outcomes").cloned().unwrap_or_default();
    let outcome_titles: Vec<String> = serde_json::from_str(&outcomes_json).unwrap_or_default();

    // Convert to Outcome structs
    let outcomes: Vec<twitch_api::Outcome> = outcome_titles
        .into_iter()
        .map(|title| twitch_api::Outcome { title })
        .collect();

    let prediction_window = args
        .get("prediction_window")
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(90);

    let payload = twitch_api::TwitchPrediction {
        broadcaster_id,
        title,
        outcomes,
        prediction_window,
    };
    twitch_api::create_twitch_prediction(client_id, access_token, payload).await
}
#[tauri::command]
async fn get_user_data_cmd(args: HashMap<String, String>) -> Result<String, String> {
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let access_token = args.get("token").cloned().unwrap_or_default();
    let username = args.get("username").cloned().unwrap_or_default();

    twitch_api::get_user_data(client_id, access_token, username).await
}

#[tauri::command]
async fn refresh_tokens_cmd(
    args: HashMap<String, String>,
) -> Result<twitch_api::TokenResponse, String> {
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let client_secret = args.get("client_secret").cloned().unwrap_or_default();
    let refresh_token = args.get("refresh_token").cloned().unwrap_or_default();

    twitch_api::refresh_tokens(client_id, client_secret, refresh_token).await
}

#[tauri::command]
async fn get_last_predictions_cmd(args: HashMap<String, String>) -> Result<String, String> {
    let amount = args
        .get("amount")
        .and_then(|v| v.parse::<u32>().ok())
        .unwrap_or(1);
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let token = args.get("token").cloned().unwrap_or_default();
    let broadcaster_id = args.get("broadcaster_id").cloned().unwrap_or_default();

    twitch_api::get_last_predictions(amount, client_id, token, broadcaster_id).await
}

#[tauri::command]
async fn cancel_prediction_cmd(args: HashMap<String, String>) -> Result<String, String> {
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let access_token = args.get("token").cloned().unwrap_or_default();
    let broadcaster_id = args.get("broadcaster_id").cloned().unwrap_or_default();
    let id = args.get("id").cloned().unwrap_or_default();

    twitch_api::cancel_prediction(client_id, access_token, broadcaster_id, id).await
}

#[tauri::command]
async fn end_prediction_cmd(args: HashMap<String, String>) -> Result<String, String> {
    let client_id = args.get("client_id").cloned().unwrap_or_default();
    let access_token = args.get("token").cloned().unwrap_or_default();
    let broadcaster_id = args.get("broadcaster_id").cloned().unwrap_or_default();
    let id = args.get("id").cloned().unwrap_or_default();
    let winning_outcome_id = args.get("winning_outcome_id").cloned().unwrap_or_default();

    twitch_api::end_prediction(
        client_id,
        access_token,
        broadcaster_id,
        id,
        winning_outcome_id,
    )
    .await
}

#[tauri::command]
async fn exchange_code_for_tokens_cmd(
    code: String,
    client_id: String,
    client_secret: String,
    redirect_uri: String,
) -> Result<String, String> {
    twitch_api::exchange_code_for_tokens(code, client_id, client_secret, redirect_uri).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            write_file,
            read_file,
            create_twitch_prediction_cmd,
            refresh_tokens_cmd,
            get_user_data_cmd,
            exchange_code_for_tokens_cmd,
            get_last_predictions_cmd,
            cancel_prediction_cmd,
            end_prediction_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
