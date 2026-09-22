import { createClient } from 'redis';
import config from '../config';

export const redisClient = createClient({
    username: config.redis_user,
    password: config.redis_password,
    socket: {
        host: config.redis_host,
        port: Number(config.redis_port)
    }
});
let hasLoggedError = false;

redisClient.on("error", (err) => {
	
	if (!hasLoggedError) {
		console.error(
			` Redis connection failed (${err.message}). Is Redis running at ` +
				`${config.redis_host}:${config.redis_port}? OTP/email-verification, ` +
				"password reset, and bKash token caching will not work until it is.",
		);
		hasLoggedError = true;
	}
});

redisClient.on("connect", () => {
	hasLoggedError = false;
});


export const setWithExpiry = async (
	key: string,
	value: string,
	expirationSeconds: number,
) => {
	await redisClient.set(key, value, { EX: expirationSeconds });
};