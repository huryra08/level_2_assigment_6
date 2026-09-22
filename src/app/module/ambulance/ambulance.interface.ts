export interface ICreateAmbulancePayload {
	plateNumber: string;
	type?: "BASIC" | "ADVANCED_LIFE_SUPPORT" | "ICU" | "NEONATAL";
	homeHospitalId?: string;
	driverId?: string;
}

export interface IUpdateAmbulancePayload {
	type?: "BASIC" | "ADVANCED_LIFE_SUPPORT" | "ICU" | "NEONATAL";
	status?: "AVAILABLE" | "ON_TRIP" | "MAINTENANCE" | "OUT_OF_SERVICE";
	homeHospitalId?: string | null;
	driverId?: string | null;
}
