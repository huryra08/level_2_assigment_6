import { Router } from "express";
//import { Role } from "../../../generated/prisma";
import { auth } from "../../middleware/checkAuth";
import { strictRateLimiter } from "../../middleware/rateLimiter";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";

const router = Router();

router.post(
	"/register",
	strictRateLimiter,
	validateRequest(AuthValidation.RegisterZodSchema),
	AuthController.register,
);

router.post(
	"/verify-email",
	validateRequest(AuthValidation.VerifyEmailZodSchema),
	AuthController.verifyEmail,
);

router.post(
	"/login",
	strictRateLimiter,
	validateRequest(AuthValidation.LoginZodSchema),
	AuthController.login,
);

router.post(
	"/google",
	strictRateLimiter,
	validateRequest(AuthValidation.GoogleLoginZodSchema),
	AuthController.googleLogin,
);

router.get("/me", auth(Role.USER, Role.DRIVER, Role.ADMIN), AuthController.getMe);

router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

router.post(
	"/forgot-password",
	strictRateLimiter,
	validateRequest(AuthValidation.ForgotPasswordZodSchema),
	AuthController.forgotPassword,
);

router.post(
	"/reset-password",
	strictRateLimiter,
	validateRequest(AuthValidation.ResetPasswordZodSchema),
	AuthController.resetPassword,
);

router.patch(
	"/change-password",
	auth(Role.USER, Role.DRIVER, Role.ADMIN),
	validateRequest(AuthValidation.ChangePasswordZodSchema),
	AuthController.changePassword,
);

export const AuthRoutes = router;
