use axum::middleware;
use axum::routing::{get, post};
use axum::Router;

use crate::handlers::auth_handler;
use crate::middleware::auth::require_auth;
use crate::middleware::AppState;
use crate::middleware::rate_limit::{
    auth_limiter, forgot_password_limiter, reset_password_limiter, signup_limiter,
};

pub fn routes(state: AppState) -> Router {
    let public = Router::new()
        .route("/signup", post(auth_handler::signup).route_layer(middleware::from_fn(signup_limiter)))
        .route("/login", post(auth_handler::login).route_layer(middleware::from_fn(auth_limiter)))
        .route("/logout", post(auth_handler::logout))
        .route("/forgot-password", post(auth_handler::forgot_password).route_layer(middleware::from_fn(forgot_password_limiter)))
        .route("/reset-password", post(auth_handler::reset_password).route_layer(middleware::from_fn(reset_password_limiter)))
        .with_state(state.clone());
    let protected = Router::new()
        .route("/me", get(auth_handler::me))
        .route_layer(middleware::from_fn_with_state(state.clone(), require_auth))
        .with_state(state);
    public.merge(protected)
}
