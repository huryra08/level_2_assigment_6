import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const env = (key: string, fallback?: string) => {
	const value = process.env[key] ?? fallback ?? "";
	return value.trim();
};

export default {
	node_env: env("NODE_ENV"),
	port: Number(env("PORT", "5000")) || 5000,
	app_url: env("APP_URL"),
	frontend_url: env("FRONTEND_URL"),
	database_url: env("DATABASE_URL"),

	bcrypt_salt_rounds: env("BCRYPT_SALT_ROUNDS", "10"),
	jwt_access_secret: env("JWT_ACCESS_SECRET"),
	jwt_refresh_secret: env("JWT_REFRESH_SECRET"),
	jwt_access_expires_in: env("JWT_ACCESS_EXPIRES_IN"),
	jwt_refresh_expires_in: env("JWT_REFRESH_EXPIRES_IN"),

	google_client_id: env("GOOGLE_CLIENT_ID"),

	super_admin_name: env("SUPER_ADMIN_NAME"),
	super_admin_email: env("SUPER_ADMIN_EMAIL"),
	super_admin_password: env("SUPER_ADMIN_PASSWORD"),

	redis_host: env("REDIS_HOST"),
	redis_port: env("REDIS_PORT"),
	redis_user: env("REDIS_USER"),
	redis_password: env("REDIS_PASSWORD"),

	smtp_host: env("SMTP_HOST"),
	smtp_port: env("SMTP_PORT"),
	smtp_user: env("SMTP_USER"),
	smtp_password: env("SMTP_PASSWORD"),
	email_sender: env("EMAIL_SENDER"),

	cloudinary_cloude_name: env("CLOUDINARY_CLOUD_NAME"),
	cloudinary_cloude_key: env("CLOUDINARY_API_KEY"),
	cloudinary_cloude_secret: env("CLOUDINARY_API_SECRET"),

	bkash_base_url: env("BKASH_BASE_URL"),
	bkash_username: env("BKASH_USERNAME"),
	bkash_password: env("BKASH_PASSWORD"),
	bkash_app_key: env("BKASH_APP_KEY"),
	bkash_app_secret: env("BKASH_APP_SECRET"),
	bkash_callback_url: env("BKASH_CALLBACK_URL"),

	sslcommerz_store_id: env("SSLCOMMERZ_STORE_ID"),
	sslcommerz_sanbox_url: env("SSLCOMMERZ_SANDBOX_URL"),
	sslcommerz_store_password: env("SSLCOMMERZ_STORE_PASSWORD"),
	sslcommerz_is_live: env("SSLCOMMERZ_IS_LIVE") === "true",
	sslcommerz_success_url: env("SSLCOMMERZ_SUCCESS_URL"),
	sslcommerz_fail_url: env("SSLCOMMERZ_FAIL_URL"),
	sslcommerz_cancel_url: env("SSLCOMMERZ_CANCEL_URL"),
	sslcommerz_ipn_url: env("SSLCOMMERZ_IPN_URL"),
};
