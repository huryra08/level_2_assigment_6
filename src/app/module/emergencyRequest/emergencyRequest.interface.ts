export interface ICreateEmergencyRequestPayload {
	patientName: string;
	patientPhone: string;
	patientAge?: number;
	patientGender?: "MALE" | "FEMALE" | "OTHER";
	notes?: string;
	pickupAddress: string;
	pickupLat: number;
	pickupLng: number;
	priority?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface IAssignAmbulancePayload {
	ambulanceId: string;
}

export type TRequestStatus =
	| "DRIVER_EN_ROUTE"
	| "ARRIVED_AT_PICKUP"
	| "PATIENT_ONBOARD"
	| "EN_ROUTE_TO_HOSPITAL"
	| "ARRIVED_AT_HOSPITAL"
	| "COMPLETED";

export interface IUpdateStatusPayload {
	status: TRequestStatus;
	hospitalId?: string;
	distanceKm?: number;
	fareAmount?: number;
}

export interface ICancelRequestPayload {
	cancelReason: string;
}
