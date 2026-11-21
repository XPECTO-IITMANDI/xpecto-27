use axum::{
    extract::{Extension, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::config::Config;
use crate::database::AppDatabase;
use crate::middleware::AppState;
use crate::middleware::auth::{require_auth, CurrentUser};
use crate::services::auth_service::AuthService;
use crate::models::user::{
    ForgotPasswordInput, LoginInput, ResetPasswordInput, SignupInput,
};

fn json_user(user: &crate::models::user::UserView) -> serde_json::Value {
    json!({ "user": user })
}

pub async fn signup(
    State(state): State<AppState>,
    Json(payload): Json<SignupInput>,
) -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let auth_service = AuthService::new(state.db.clone(), config.clone());
    let (user, token) = auth_service.signup(payload).await?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        auth_service.set_token_cookie(&token),
    );
    Ok((headers, Json(json_user(&user))).into_response())
}


pub async fn forgot_password(
    State(state): State<AppState>,
    Json(payload): Json<ForgotPasswordInput>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let config = Config::from_env()?;
    AuthService::new(state.db, config).forgot_password(payload).await?;
    Ok(Json(json!({"ok": true, "message": "If the account exists, a password reset OTP was sent."})))
}

pub async fn reset_password(
    State(state): State<AppState>,
    Json(payload): Json<ResetPasswordInput>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let config = Config::from_env()?;
    AuthService::new(state.db, config).reset_password(payload).await?;
    Ok(Json(json!({"ok": true, "message": "Password reset successfully."})))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginInput>,
) -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let auth_service = AuthService::new(state.db.clone(), config.clone());
    let (user, token) = auth_service.login(payload).await?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        auth_service.set_token_cookie(&token),
    );
    Ok((headers, Json(json_user(&user))).into_response())
}

pub async fn logout() -> Result<Response, crate::errors::AppError> {
    let config = Config::from_env()?;
    let mut headers = HeaderMap::new();
    headers.insert(
        axum::http::header::SET_COOKIE,
        crate::services::auth_service::clear_token_cookie(&config),
    );
    Ok((headers, Json(json!({ "ok": true }))).into_response())
}

pub async fn me(
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    Ok(Json(json!({ "user": {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "college": current_user.college,
        "state": current_user.state,
        "role": current_user.role,
    } })))
}

pub async fn my_qrs(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let user_id = mongodb::bson::oid::ObjectId::parse_str(&current_user.id)
        .map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let mut cursor = state.db.user_qrs
        .find(mongodb::bson::doc! { "user_id": user_id }, None)
        .await
        .map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let mut qrs = Vec::new();
    use mongodb::bson::doc;
    use mongodb::bson::Bson;
    while cursor.advance().await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))? {
        let d = cursor.deserialize_current().map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
        qrs.push(json!({
            "id": d.get_object_id("_id").ok().map(|v| v.to_hex()).unwrap_or_default(),
            "kind": d.get_str("kind").unwrap_or("event"),
            "label": d.get_str("label").unwrap_or(""),
            "qrUrl": d.get_str("qr_url").unwrap_or(""),
        }));
    }
    Ok(Json(json!({ "qrs": qrs })))
}
