import app from "./app";
import config from "./app/config";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { redisClient } from "./app/lib/redis";
import { seedSuperAdmin } from "./app/utils/seed";

const PORT = Number(config.port) || 5000;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("Connected to PostgreSQL via Prisma");

		await redisClient.connect().then(
			() => console.log("Connected to Redis"),
			(err) => {
				console.warn(
					"Could not connect to Redis (server will still start):",
					(err as Error).message,
				);
			},
		);

		try {
			await transporter.verify();
			console.log("Nodemailer SMTP connection verified");
		} catch (mailError) {
			console.warn(
				"Nodemailer could not verify SMTP connection (emails will fail until fixed):",
				(mailError as Error).message,
			);
		}

		await seedSuperAdmin();

		app.listen(PORT, () => {
			console.log(`Emergency Ambulance Dispatch API running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Failed to start server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();

