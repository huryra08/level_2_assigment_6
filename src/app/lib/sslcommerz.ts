import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../utils/AppError";

const SSL_BASE_URL = config.sslcommerz_is_live
	? "https://securepay.sslcommerz.com"
	: "https://sandbox.sslcommerz.com";

interface IInitSslCommerzPayment {
	total_amount: number;
	tran_id: string;
	cus_name: string;
	cus_email: string;
	cus_phone: string;
	cus_add1: string;
	product_name?: string;
}


export const initSslCommerzPayment = async (
	payload: IInitSslCommerzPayment,
) => {
	const body = new URLSearchParams({
		store_id: config.sslcommerz_store_id,
		store_passwd: config.sslcommerz_store_password,
		total_amount: String(payload.total_amount),
		currency: "BDT",
		tran_id: payload.tran_id,
		success_url: config.sslcommerz_success_url,
		fail_url: config.sslcommerz_fail_url,
		cancel_url: config.sslcommerz_cancel_url,
		ipn_url: config.sslcommerz_ipn_url,
		shipping_method: "NO",
		product_name: payload.product_name || "Ambulance Trip Fare",
		product_category: "Emergency Service",
		product_profile: "service",
		cus_name: payload.cus_name,
		cus_email: payload.cus_email,
		cus_add1: payload.cus_add1,
		cus_city: "Dhaka",
		cus_country: "Bangladesh",
		cus_phone: payload.cus_phone,
	});

	const response = await fetch(
		`${SSL_BASE_URL}/gwprocess/v4/api.php`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: body.toString(),
		},
	);

	const result = (await response.json()) as any;

	if (result.status !== "SUCCESS") {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			result.failedreason || "SSLCommerz session initiation failed",
		);
	}

	return result as {
		status: string;
		sessionkey: string;
		GatewayPageURL: string;
	};
};


export const validateSslCommerzPayment = async (val_id: string): Promise<any> => {
	const params = new URLSearchParams({
		val_id,
		store_id: config.sslcommerz_store_id,
		store_passwd: config.sslcommerz_store_password,
		format: "json",
	});

	const response = await fetch(
		`${SSL_BASE_URL}/validator/api/validationserverAPI.php?${params.toString()}`,
	);

	return response.json();
};
