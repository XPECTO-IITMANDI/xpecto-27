use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Clone)]
pub struct RateLimiter {
    state: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            state: Arc::new(Mutex::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    pub async fn middleware(self, req: Request, next: Next) -> Response {
        let ip = req
            .headers()
            .get("x-forwarded-for")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.split(',').next())
            .map(str::trim)
            .filter(|v| !v.is_empty())
            .unwrap_or("unknown")
            .to_string();
        let path = req.uri().path().to_string();
        let key = format!("{}:{}", ip, path);
        let now = Instant::now();

        let allowed = {
            let mut states = self.state.lock().unwrap();
            let attempts = states.entry(key).or_default();
            attempts.retain(|at| now.duration_since(*at) < self.window);
            if attempts.len() >= self.max_requests {
                false
            } else {
                attempts.push(now);
                true
            }
        };

        if !allowed {
            return (
                StatusCode::TOO_MANY_REQUESTS,
                Json(json!({
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Too many requests. Please try again later."
                    }
                })),
            )
                .into_response();
        }

        next.run(req).await
    }
}

static AUTH_LIMITER: std::sync::OnceLock<RateLimiter> = std::sync::OnceLock::new();
static FORGOT_LIMITER: std::sync::OnceLock<RateLimiter> = std::sync::OnceLock::new();
static RESET_LIMITER: std::sync::OnceLock<RateLimiter> = std::sync::OnceLock::new();
static SIGNUP_LIMITER: std::sync::OnceLock<RateLimiter> = std::sync::OnceLock::new();
static PUBLIC_WRITE_LIMITER: std::sync::OnceLock<RateLimiter> = std::sync::OnceLock::new();

pub async fn auth_limiter(req: Request, next: Next) -> Response {
    let limiter = AUTH_LIMITER.get_or_init(|| RateLimiter::new(10, Duration::from_secs(60)));
    limiter.clone().middleware(req, next).await
}

pub async fn signup_limiter(req: Request, next: Next) -> Response {
    let limiter = SIGNUP_LIMITER.get_or_init(|| RateLimiter::new(5, Duration::from_secs(60 * 60)));
    limiter.clone().middleware(req, next).await
}

pub async fn forgot_password_limiter(req: Request, next: Next) -> Response {
    let limiter = FORGOT_LIMITER.get_or_init(|| RateLimiter::new(3, Duration::from_secs(60 * 60)));
    limiter.clone().middleware(req, next).await
}

pub async fn reset_password_limiter(req: Request, next: Next) -> Response {
    let limiter = RESET_LIMITER.get_or_init(|| RateLimiter::new(5, Duration::from_secs(10 * 60)));
    limiter.clone().middleware(req, next).await
}

pub async fn public_write_limiter(req: Request, next: Next) -> Response {
    let limiter = PUBLIC_WRITE_LIMITER.get_or_init(|| RateLimiter::new(20, Duration::from_secs(10 * 60)));
    limiter.clone().middleware(req, next).await
}
