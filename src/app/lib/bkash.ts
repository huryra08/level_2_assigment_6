import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../utils/AppError";
import { redisClient } from "./redis";

const ID_TOKEN_KEY = "bkash:idToken";
const REFRESH_TOKEN_KEY = "bkash:refreshToken";


export const getBkashIdToken = async (): Promise<string> => {
	try {
		const cachedIdToken = await redisClient.get(ID_TOKEN_KEY);
		const idTokenTTL = await redisClient.ttl(ID_TOKEN_KEY);

		const cachedRefreshToken = await redisClient.get(REFRESH_TOKEN_KEY);
		const refreshTokenTTL = await redisClient.ttl(REFRESH_TOKEN_KEY);

		
		if (cachedIdToken && idTokenTTL > 600) {
			return cachedIdToken;
		}

		
		if (cachedRefreshToken && refreshTokenTTL > 600) {
			const refreshResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: cachedRefreshToken,
					}),
				},
			);

			if (!refreshResponse.ok) {
				throw new AppError(
					httpStatus.BAD_GATEWAY,
					"bKash access token refresh failed",
				);
			}

			const result = (await refreshResponse.json()) as any;

			await redisClient.set(ID_TOKEN_KEY, result.id_token, { EX: 60 * 60 });

			return result.id_token as string;
		}

		
		const grantResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
				body: JSON.stringify({
					app_key: config.bkash_app_key,
					app_secret: config.bkash_app_secret,
				}),
			},
		);

		if (!grantResponse.ok) {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				"bKash access token grant failed",
			);
		}

		const result = (await grantResponse.json()) as any;

		await redisClient.set(ID_TOKEN_KEY, result.id_token, { EX: 60 * 60 });
		await redisClient.set(REFRESH_TOKEN_KEY, result.refresh_token, {
			EX: 60 * 60 * 24 * 28,
		});

		return result.id_token as string;
	} catch (error: any) {
		if (error instanceof AppError) throw error;
		throw new AppError(httpStatus.BAD_GATEWAY, error.message);
	}
};

export const createBkashPayment = async (params: {
	amount: string;
	merchantInvoiceNumber: string;
	callbackURL: string;
}) => {
	const idToken = await getBkashIdToken();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: idToken,
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference: params.merchantInvoiceNumber,
				callbackURL: params.callbackURL,
				amount: params.amount,
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: params.merchantInvoiceNumber,
			}),
		},
	);

	const result = (await response.json()) as any;

	if (!response.ok || result.statusCode !== "0000") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.statusMessage || "bKash create payment failed",
		);
	}

	return result;
};

export const executeBkashPayment = async (paymentID: string) => {
	const idToken = await getBkashIdToken();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: idToken,
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({ paymentID }),
		},
	);

	const result = (await response.json()) as any;

	return result;
};

export const queryBkashPayment = async (paymentID: string): Promise<any> => {
	const idToken = await getBkashIdToken();

	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/payment/status`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: idToken,
				"X-App-Key": config.bkash_app_key,
			},
			body: JSON.stringify({ paymentID }),
		},
	);

	return response.json();
};
