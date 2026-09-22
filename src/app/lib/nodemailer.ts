import nodemailer from "nodemailer";
import config from "../config";

export const transporter = nodemailer.createTransport({
	host: config.smtp_host,
	port: Number(config.smtp_port) || 587,
	secure: false,
	auth: {
		user: config.smtp_user,
		pass: config.smtp_password,
	},
});
