mod twitch_api;

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_twitch_prediction_cmd(
    client_id: String,
    client_secret: String,
    access_token: String,
    title: String,
    outcomes: Vec<String>,
    prediction_window: u32,
) -> Result<String, String> {
    let payload = twitch_api::TwitchPrediction {
        title,
        outcomes,
        prediction_window,
    };
    twitch_api::create_twitch_prediction(client_id, client_secret, access_token, payload).await
}

#[tauri::command]
async fn get_twitch_tokens_cmd(
    client_id: String,
    client_secret: String,
) -> Result<String, String> {
    twitch_api::get_twitch_tokens(client_id, client_secret).await
}

#[tauri::command]
async fn get_user_id_cmd(
    client_id: String,
    client_secret: String,
    access_token: String,
    username: String,
) -> Result<String, String> {
    twitch_api::get_user_id(client_id, client_secret, access_token, username).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            write_file, read_file, create_twitch_prediction_cmd, get_twitch_tokens_cmd, get_user_id_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
