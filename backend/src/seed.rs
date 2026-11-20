use mongodb::bson::{doc, DateTime};
use serde_json::Value;
use std::path::PathBuf;
use tracing::info;

use crate::database::AppDatabase;

pub struct Seed;

impl Seed {
    pub async fn run_if_empty(db: &AppDatabase, seed_dir: &std::path::Path) -> anyhow::Result<()> {
        let count = db.fest_info.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_fest(db, seed_dir.join("fest.json")).await?;
        }

        let count = db.mess_options.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_mess(db, seed_dir.join("mess.json")).await?;
        }

        let count = db.payment_info.count_documents(doc! {}, None).await?;
        if count == 0 {
            Self::seed_payment(db, seed_dir.join("payment.json")).await?;
        }

        let exists = db
            .admins
            .count_documents(
                doc! { "email": crate::services::auth_service::DEFAULT_ADMIN_EMAIL },
                None,
            )
            .await?;
        if exists == 0 {
            let now = DateTime::now();
            db.admins
                .insert_one(
                    doc! { "email": crate::services::auth_service::DEFAULT_ADMIN_EMAIL, "created_at": now },
                    None,
                )
                .await?;
            info!("seeded default admin email");
        }

        info!("Seed complete");
        Ok(())
    }

    fn read_json(path: PathBuf) -> anyhow::Result<Value> {
        let text = std::fs::read_to_string(path)?;
        Ok(serde_json::from_str(&text)?)
    }

    async fn seed_fest(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let now = DateTime::now();
        let doc = doc! {
            "name": data.get("name").and_then(|v| v.as_str()).unwrap_or("XPECTO"),
            "tagline": data.get("tagline").and_then(|v| v.as_str()).unwrap_or("TechFest"),
            "start_date": parse_iso(data.get("startDate").and_then(|v| v.as_str()).unwrap_or("")),
            "end_date": parse_iso(data.get("endDate").and_then(|v| v.as_str()).unwrap_or("")),
            "venue": data.get("venue").and_then(|v| v.as_str()).unwrap_or(""),
            "about_html": data.get("aboutHtml").and_then(|v| v.as_str()).unwrap_or(""),
            "hero_image_url": data.get("heroImageUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "contact_email": data.get("contactEmail").and_then(|v| v.as_str()).unwrap_or(""),
            "contact_phone": data.get("contactPhone").and_then(|v| v.as_str()).unwrap_or(""),
            "created_at": now,
            "updated_at": now,
        };
        db.fest_info.insert_one(doc, None).await?;
        info!("seeded fest info");
        Ok(())
    }

    async fn seed_mess(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let arr = data.as_array().cloned().unwrap_or_default();
        for item in arr.iter() {
            let now = DateTime::now();
            let id = item
                .get("id")
                .and_then(|v| v.as_str())
                .unwrap_or("mess")
                .to_string();
            let doc = doc! {
                "_id": id,
                "name": item.get("name").and_then(|v| v.as_str()).unwrap_or(""),
                "description": item.get("description").and_then(|v| v.as_str()).unwrap_or(""),
                "price": item.get("price").and_then(|v| v.as_i64()).unwrap_or(0),
                "image_url": item.get("imageUrl").and_then(|v| v.as_str()).unwrap_or(""),
                "created_at": now,
                "updated_at": now,
            };
            db.mess_options.insert_one(doc, None).await?;
        }
        info!("seeded {} mess options", arr.len());
        Ok(())
    }

    async fn seed_payment(db: &AppDatabase, path: PathBuf) -> anyhow::Result<()> {
        let data = Self::read_json(path)?;
        let now = DateTime::now();
        let doc = doc! {
            "qr_image_url": data.get("qrImageUrl").and_then(|v| v.as_str()).unwrap_or(""),
            "upi_id": data.get("upiId").and_then(|v| v.as_str()).unwrap_or(""),
            "note": data.get("note").and_then(|v| v.as_str()).unwrap_or(""),
            "created_at": now,
            "updated_at": now,
        };
        db.payment_info.insert_one(doc, None).await?;
        info!("seeded payment info");
        Ok(())
    }
}

fn parse_iso(s: &str) -> Option<DateTime> {
    if s.is_empty() {
        return None;
    }
    chrono::DateTime::parse_from_rfc3339(s)
        .map(|dt| DateTime::from_millis(dt.timestamp_millis()))
        .ok()
        .or_else(|| {
            chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S")
                .map(|d| d.and_utc())
                .map(|dt| DateTime::from_millis(dt.timestamp_millis()))
                .ok()
        })
}
