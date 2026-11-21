use axum::routing::{get, patch, post};
use axum::Router;

use crate::handlers::ambassador_handler;
use crate::middleware::AppState;
use crate::middleware::rate_limit::public_write_limiter;

pub fn routes(state: AppState) -> Router {
    Router::new()
        .route("/campus-ambassadors", post(ambassador_handler::create_ambassador).route_layer(axum::middleware::from_fn(public_write_limiter)))
        .with_state(state.clone())
        .merge(
            Router::new()
                .route(
                    "/admin/campus-ambassadors",
                    get(ambassador_handler::list_ambassadors),
                )
                .route(
                    "/admin/campus-ambassadors/{id}",
                    patch(ambassador_handler::decide_ambassador),
                )
                .with_state(state),
        )
}
