use axum::extract::{Path, State};
use axum::response::Json;

use crate::middleware::AppState;
use crate::services::public_service::PublicService;

pub async fn get_fest(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let fest = svc.get_fest().await?;
    Ok(Json(serde_json::to_value(&fest).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_events(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let events = svc.get_events().await?;
    Ok(Json(serde_json::to_value(&events).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_event(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let event = svc.get_event(&id).await?;
    Ok(Json(serde_json::to_value(&event).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_workshops(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let workshops = svc.get_workshops().await?;
    Ok(Json(serde_json::to_value(&workshops).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_team(State(state): State<AppState>) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let team = svc.get_team().await?;
    Ok(Json(serde_json::to_value(&team).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_sponsors(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let sponsors = svc.get_sponsors().await?;
    Ok(Json(serde_json::to_value(&sponsors).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_mess_options(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let mess = svc.get_mess_options().await?;
    Ok(Json(serde_json::to_value(&mess).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_payment_info(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let svc = PublicService::new(state.db.clone());
    let payment = svc.get_payment_info().await?;
    Ok(Json(serde_json::to_value(&payment).map_err(|e| crate::errors::AppError::Internal(e.to_string()))?))
}

pub async fn get_notices(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, crate::errors::AppError> {
    let now = crate::database::now();
    let mut cursor = state.db.notices
        .find(mongodb::bson::doc! {
            "active": true,
            "$or": [
                { "expires_at": null },
                { "expires_at": { "$gt": now } }
            ]
        }, None)
        .await
        .map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
    let mut notices = Vec::new();
    while cursor.advance().await.map_err(|e| crate::errors::AppError::Internal(e.to_string()))? {
        let d = cursor.deserialize_current().map_err(|e| crate::errors::AppError::Internal(e.to_string()))?;
        notices.push(serde_json::json!({
            "id": d.get_object_id("_id").ok().map(|v| v.to_hex()).unwrap_or_default(),
            "title": d.get_str("title").unwrap_or(""),
            "message": d.get_str("message").unwrap_or(""),
            "link": d.get_str("link").unwrap_or(""),
            "priority": d.get_i32("priority").unwrap_or(d.get_i64("priority").unwrap_or(0) as i32),
            "createdAt": d.get_datetime("created_at").ok().map(|v| v.to_rfc3339_string()).unwrap_or_default(),
        }));
    }
    notices.sort_by(|a, b| {
        let pa = a.get("priority").and_then(|v| v.as_i64()).unwrap_or(0);
        let pb = b.get("priority").and_then(|v| v.as_i64()).unwrap_or(0);
        pb.cmp(&pa).then_with(|| b.get("createdAt").and_then(|v| v.as_str()).cmp(&a.get("createdAt").and_then(|v| v.as_str())))
    });
    Ok(Json(serde_json::json!({ "notices": notices })))
}
