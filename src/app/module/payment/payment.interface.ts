export interface IInitiatePaymentPayload {
	emergencyRequestId: string;
	gateway: "BKASH" | "SSLCOMMERZ";
}

export interface IBkashExecutePayload {
	paymentID: string;
}
