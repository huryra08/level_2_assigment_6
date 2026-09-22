import { Role } from "../../../../prisma/generated/prisma/enums";

export interface IRequestUser {
	userId: string;
	name: string;
	email: string;
	role: Role;
}

export interface IRegisterUserPayload {
	name: string;
	email: string;
	password: string;
	phone?: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IGoogleLoginPayload {
	idToken: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface IChangePasswordPayload {
	oldPassword: string;
	newPassword: string;
}
