export interface ICreateDriverPayload {
	name: string;
	email: string;
	password: string;
	phone?: string;
	licenseNumber: string;
	yearsOfExperience?: number;
}

export interface IUpdateDriverPayload {
	licenseNumber?: string;
	yearsOfExperience?: number;
}

export interface IVerifyDriverPayload {
	verificationStatus: "APPROVED" | "REJECTED";
	rejectionReason?: string;
}

export interface IUpdateAvailabilityPayload {
	availability: "OFFLINE" | "AVAILABLE" | "ON_TRIP";
}

export interface IUpdateLocationPayload {
	lat: number;
	lng: number;
}
