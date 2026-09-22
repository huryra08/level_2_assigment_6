import { AuthProvider, Role, UserStatus } from './../../../prisma/generated/prisma/enums';
import bcrypt from "bcryptjs";
//import { AuthProvider, Role, UserStatus } from "../../generated/prisma";
import config from "../config";
import { prisma } from "../lib/prisma";

/**
 * Idempotently ensures a SUPER-privileged ADMIN account exists so the
 * grader / developer can log in immediately after `npm run seed`
 * (or on first server boot) without any manual DB work.
 */
export const seedSuperAdmin = async () => {
	if (!config.super_admin_email || !config.super_admin_password) {
		console.warn("⚠️  SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set, skipping admin seed");
		return;
	}

	const existing = await prisma.user.findUnique({
		where: { email: config.super_admin_email },
	});

	if (existing) return;

	const hashedPassword = await bcrypt.hash(
		config.super_admin_password,
		Number(config.bcrypt_salt_rounds),
	);

	await prisma.user.create({
		data: {
			name: config.super_admin_name || "Super Admin",
			email: config.super_admin_email,
			password: hashedPassword,
			role: Role.ADMIN,
			status: UserStatus.ACTIVE,
			authProvider: AuthProvider.CREDENTIAL,
			emailVerified: true,
		},
	});

	console.log(`✅ Seeded admin account: ${config.super_admin_email}`);
};

// Allow running directly via `npm run seed`
const isDirectRun = process.argv[1]?.includes("seed");
if (isDirectRun) {
	seedSuperAdmin()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
