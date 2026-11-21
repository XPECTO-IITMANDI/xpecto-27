use axum::http::HeaderValue;
use argon2::{password_hash::rand_core::OsRng, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use jsonwebtoken::{encode, EncodingKey, Header};
use mongodb::bson::{doc, oid::ObjectId};
use rand::Rng;
use tracing::info;

use crate::config::Config;
use crate::database::{oid_from_hex, AppDatabase};
use crate::errors::{AppError, AppResult};
use crate::models::user::{
    ForgotPasswordInput, LoginInput, ResetPasswordInput, SignupInput, User, UserView,
};
use crate::services::mailer_service;

const TOKEN_COOKIE: &str = "xpecto_token";
pub(crate) const DEFAULT_ADMIN_EMAIL: &str = "b25347@students.iitmandi.ac.in";

/// Build the Set-Cookie header value for a session token.
pub fn set_token_cookie(config: &Config, token: &str) -> HeaderValue {
    format!(
        "{}={}; HttpOnly; Path=/; SameSite=Lax; Max-Age={}",
        TOKEN_COOKIE, token, config.jwt_expires
    )
    .parse()
    .unwrap_or_else(|_| HeaderValue::from_static(""))
}

/// Build the Set-Cookie header value to clear the session token.
pub fn clear_token_cookie(config: &Config) -> HeaderValue {
    let _ = config;
    HeaderValue::from_static("xpecto_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0")
}

pub struct AuthService {
    db: AppDatabase,
    config: Config,
}

impl AuthService {
    pub fn new(db: AppDatabase, config: Config) -> Self {
        Self { db, config }
    }

    pub async fn signup(&self, input: SignupInput) -> AppResult<(UserView, String)> {
        // Check existing email.
        let exists = self
            .db
            .users
            .count_documents(doc! { "email": &input.email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if exists > 0 {
            return Err(AppError::Validation("Email already registered.".into()));
        }

        let password_hash = hash_password(&input.password)?;

        // Public signups are ALWAYS regular users. Admins can ONLY be created through the backend.
        let role = "user";
        let now = crate::database::now();
        let doc = doc! {
            "name": &input.name,
            "email": &input.email,
            "phone": &input.phone,
            "college": &input.college,
            "state": &input.state,
            "password_hash": &password_hash,
            "role": role,
            "email_verified": true,
            "reset_otp_hash": null,
            "reset_otp_expires": null,
            "reset_last_used": null,
            "reset_otp_attempts": 0,
            "reset_last_sent": null,
            "created_at": now,
            "updated_at": now,
        };

        let result = self
            .db
            .users
            .insert_one(doc, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let id = result.inserted_id.as_object_id().unwrap_or_default();

        let user = User {
            id: Some(id),
            name: input.name,
            email: input.email,
            phone: input.phone,
            college: input.college,
            state: input.state,
            email_verified: true,
            password_hash,
            role: role.to_string(),
            created_at: Some(now),
            updated_at: Some(now),
        };

        info!("User registered: {} (role={})", user.email, user.role);
        let token = self.issue_token(&user)?;
        Ok((user.view(), token))
    }

    pub async fn login(&self, input: LoginInput) -> AppResult<(UserView, String)> {
        let doc = self
            .db
            .users
            .find_one(doc! { "email": &input.email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let doc = doc.ok_or_else(|| AppError::Unauthenticated("Wrong email or password.".into()))?;

        let password_hash = doc
            .get_str("password_hash")
            .map_err(|_| AppError::Unauthenticated("Wrong email or password.".into()))?;

        if !verify_password(&input.password, password_hash)? {
            return Err(AppError::Unauthenticated("Wrong email or password.".into()));
        }

        let id = doc.get_object_id("_id").unwrap_or_default();
        let mut role = doc.get_str("role").unwrap_or("user").to_string();

        // Also check db.admins to ensure anyone listed as admin gets the admin role.
        if role != "admin" {
            let admin_count = self
                .db
                .admins
                .count_documents(doc! { "email": &input.email }, None)
                .await
                .unwrap_or(0);
            if admin_count > 0 {
                role = "admin".to_string();
                let _ = self
                    .db
                    .users
                    .update_one(doc! { "_id": id }, doc! { "$set": { "role": "admin" } }, None)
                    .await;
            }
        }

        let user = User {
            id: Some(id),
            name: doc.get_str("name").unwrap_or("").to_string(),
            email: doc.get_str("email").unwrap_or("").to_string(),
            phone: doc.get_str("phone").unwrap_or("").to_string(),
            college: doc.get_str("college").unwrap_or("").to_string(),
            state: doc.get_str("state").unwrap_or("").to_string(),
            email_verified: doc.get_bool("email_verified").unwrap_or(true),
            password_hash: password_hash.to_string(),
            role,
            created_at: doc.get_datetime("created_at").ok().map(|d| *d),
            updated_at: doc.get_datetime("updated_at").ok().map(|d| *d),
        };

        let token = self.issue_token(&user)?;
        info!("User logged in: {} (role={})", user.email, user.role);
        Ok((user.view(), token))
    }

    /// Provision or update an admin user directly from the backend.
    /// This sets their role to "admin", hashes their password, and ensures they're in db.admins.
    pub async fn create_or_update_admin(
        &self,
        email: &str,
        password: &str,
        name: &str,
        phone: &str,
        college: &str,
    ) -> AppResult<UserView> {
        let password_hash = hash_password(password)?;
        let now = crate::database::now();
        let existing = self
            .db
            .users
            .find_one(doc! { "email": email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;

        let user = match existing {
            Some(doc) => {
                let id = doc.get_object_id("_id").unwrap_or_default();
                self.db
                    .users
                    .update_one(
                        doc! { "_id": id },
                        doc! {
                            "$set": {
                                "password_hash": &password_hash,
                                "role": "admin",
                                "name": name,
                                "phone": phone,
                                "college": college,
                                "updated_at": now,
                            }
                        },
                        None,
                    )
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                User {
                    id: Some(id),
                    name: name.to_string(),
                    email: email.to_string(),
                    phone: phone.to_string(),
                    college: college.to_string(),
                    state: "".to_string(),
                    email_verified: true,
                    password_hash,
                    role: "admin".to_string(),
                    created_at: doc.get_datetime("created_at").ok().map(|d| *d),
                    updated_at: Some(now),
                }
            }
            None => {
                let doc = doc! {
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "college": college,
                    "state": "",
                    "password_hash": &password_hash,
                    "role": "admin",
                    "created_at": now,
                    "updated_at": now,
                };
                let result = self
                    .db
                    .users
                    .insert_one(doc, None)
                    .await
                    .map_err(|e| AppError::Internal(e.to_string()))?;
                let id = result.inserted_id.as_object_id().unwrap_or_default();
                User {
                    id: Some(id),
                    name: name.to_string(),
                    email: email.to_string(),
                    phone: phone.to_string(),
                    college: college.to_string(),
                    state: "".to_string(),
                    email_verified: true,
                    password_hash,
                    role: "admin".to_string(),
                    created_at: Some(now),
                    updated_at: Some(now),
                }
            }
        };

        // Ensure email exists in db.admins collection as well
        let admin_exists = self
            .db
            .admins
            .count_documents(doc! { "email": email }, None)
            .await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        if admin_exists == 0 {
            self.db
                .admins
                .insert_one(doc! { "email": email, "created_at": now }, None)
                .await
                .map_err(|e| AppError::Internal(e.to_string()))?;
        }

        info!("Admin provisioned successfully: {} (role=admin)", email);
        Ok(user.view())
    }

    pub fn build_user_view(id: &ObjectId, name: &str, email: &str, phone: &str, college: &str, role: &str) -> UserView {
        UserView {
            id: id.to_hex(),
            name: name.to_string(),
            email: email.to_string(),
            phone: phone.to_string(),
            college: college.to_string(),
            state: "".to_string(),
            email_verified: true,
            role: role.to_string(),
        }
    }

    pub async fn forgot_password(&self, input: ForgotPasswordInput) -> AppResult<()> {
        let now = crate::database::now();
        let mut doc = self.db.users.find_one(doc! { "email": &input.email }, None).await
            .map_err(|e| AppError::Internal(e.to_string()))?;
        let Some(mut doc) = doc.take() else {
            return Ok(()); // Do not disclose whether an account exists.
        };
        if reset_used_within_24h(&doc, now) {
            return Err(AppError::Conflict("Password can be reset only once every 24 hours.".into()));
        }
        resend_guard(&mut doc, "reset", now)?;
        let otp = generate_otp();
        let otp_hash = hash_password(&otp)?;
        let expires = mongodb::bson::DateTime::from_millis(now.timestamp_millis() + 10 * 60 * 1000);
        self.db.users.update_one(
            doc! { "email": &input.email },
            doc! { "$set": {
                "reset_otp_hash": otp_hash,
                "reset_otp_expires": expires,
                "reset_otp_attempts": 0,
                "reset_last_sent": now,
                "updated_at": now,
            } },
            None,
        ).await.map_err(|e| AppError::Internal(e.to_string()))?;
        let name = doc.get_str("name").unwrap_or("XPECTO user").to_string();
        mailer_service::send_otp_email(&input.email, &name, &otp, "password-reset")
            .await
            .map_err(|e| AppError::Internal(format!("Could not send password reset email: {}", e)))?;
        Ok(())
    }

    pub async fn reset_password(&self, input: ResetPasswordInput) -> AppResult<()> {
        if input.password.len() < 8 {
            return Err(AppError::Validation("Use at least 8 characters.".into()));
        }
        let now = crate::database::now();
        let doc = self.db.users.find_one(doc! { "email": &input.email }, None).await
            .map_err(|e| AppError::Internal(e.to_string()))?
            .ok_or_else(|| AppError::NotFound("Account not found.".into()))?;
        if reset_used_within_24h(&doc, now) {
            return Err(AppError::Conflict("Password can be reset only once every 24 hours.".into()));
        }
        if let Err(error) = verify_otp_guard(&doc, "reset", &input.otp, now) {
            if error.message() == "Invalid OTP." {
                let _ = self.db.users.update_one(
                    doc! { "_id": doc.get_object_id("_id").unwrap_or_default() },
                    doc! { "$inc": { "reset_otp_attempts": 1 } },
                    None,
                ).await;
            }
            return Err(error);
        }
        let id = doc.get_object_id("_id").unwrap_or_default();
        let password_hash = hash_password(&input.password)?;
        self.db.users.update_one(
            doc! { "_id": id },
            doc! { "$set": {
                "password_hash": password_hash,
                "reset_otp_attempts": 0,
                "reset_last_used": now,
                "updated_at": now,
            }, "$unset": {
                "reset_otp_hash": "",
                "reset_otp_expires": "",
            } },
            None,
        ).await.map_err(|e| AppError::Internal(e.to_string()))?;
        Ok(())
    }

    fn issue_token(&self, user: &User) -> AppResult<String> {
        let now = chrono::Utc::now().timestamp();
        let exp = now + self.config.jwt_expires;
        let claims = crate::middleware::auth::Claims {
            sub: user.id.as_ref().map(|o| o.to_hex()).unwrap_or_default(),
            role: user.role.clone(),
            exp,
            iat: now,
        };
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.jwt_secret.as_bytes()),
        )
        .map_err(|e| AppError::Internal(e.to_string()))
    }

    pub fn set_token_cookie(&self, token: &str) -> http::header::HeaderValue {
        crate::services::auth_service::set_token_cookie(&self.config, token)
    }

    pub fn clear_token_cookie(&self) -> http::header::HeaderValue {
        crate::services::auth_service::clear_token_cookie(&self.config)
    }

    pub fn default_admin_email() -> &'static str {
        DEFAULT_ADMIN_EMAIL
    }
}

fn reset_used_within_24h(doc: &mongodb::bson::Document, now: mongodb::bson::DateTime) -> bool {
    doc.get_datetime("reset_last_used")
        .map(|last| now.timestamp_millis() - last.timestamp_millis() < 24 * 60 * 60 * 1000)
        .unwrap_or(false)
}

fn generate_otp() -> String {
    rand::thread_rng().gen_range(100000..1000000).to_string()
}

fn resend_guard(doc: &mut mongodb::bson::Document, purpose: &str, now: mongodb::bson::DateTime) -> AppResult<()> {
    let last_key = if purpose == "reset" { "reset_last_sent" } else { "verification_last_sent" };
    if let Ok(last) = doc.get_datetime(last_key) {
        if now.timestamp_millis() - last.timestamp_millis() < 60 * 1000 {
            return Err(AppError::TooLarge("Please wait before requesting another OTP.".into()));
        }
    }
    Ok(())
}

fn verify_otp_guard(doc: &mongodb::bson::Document, purpose: &str, otp: &str, now: mongodb::bson::DateTime) -> AppResult<()> {
    let prefix = if purpose == "reset" { "reset" } else { "verification" };
    let hash_key = format!("{}_otp_hash", prefix);
    let expires_key = format!("{}_otp_expires", prefix);
    let attempts_key = format!("{}_otp_attempts", prefix);
    let otp_hash = doc.get_str(&hash_key).map_err(|_| AppError::Validation("OTP not found or already used.".into()))?;
    let expires = doc.get_datetime(&expires_key).map_err(|_| AppError::Validation("OTP expired or already used.".into()))?;
    if now.timestamp_millis() > expires.timestamp_millis() {
        return Err(AppError::Validation("OTP has expired. Request a new one.".into()));
    }
    let attempts = doc.get_i32(&attempts_key).unwrap_or(doc.get_i64(&attempts_key).unwrap_or(0) as i32);
    if attempts >= 5 {
        return Err(AppError::TooLarge("Too many invalid attempts. Request a new OTP.".into()));
    }
    if !verify_password(otp, otp_hash)? {
        return Err(AppError::Unauthenticated("Invalid OTP.".into()));
    }
    Ok(())
}

fn hash_password(password: &str) -> AppResult<String> {
    let argon2 = Argon2::default();
    let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string();
    Ok(hash)
}

fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let parsed_hash = PasswordHash::new(hash).map_err(|e| AppError::Internal(e.to_string()))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}
