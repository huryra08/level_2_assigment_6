import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, type Application, type Request, type Response } from "express";
import helmet from "helmet";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { globalRateLimiter } from "./app/middleware/rateLimiter";
import { redisClient } from "./app/lib/redis";
import { input } from "zod";
import { AdminRoutes } from "./app/module/admin/admin.route";
import { AmbulanceRoutes } from "./app/module/ambulance/ambulance.route";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { DriverRoutes } from "./app/module/driver/driver.route";
import { EmergencyRequestRoutes } from "./app/module/emergencyRequest/emergencyRequest.route";
import { HospitalRoutes } from "./app/module/hospital/hospital.route";
import { NotificationRoutes } from "./app/module/notification/notification.route";
import { PaymentRoutes } from "./app/module/payment/payment.route";
import { UserRoutes } from "./app/module/user/user.route";

const app: Application = express();

app.use(helmet());

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(globalRateLimiter);



app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/users", UserRoutes);
app.use("/api/v1/drivers", DriverRoutes);
app.use("/api/v1/ambulances", AmbulanceRoutes);
app.use("/api/v1/hospitals", HospitalRoutes);
app.use("/api/v1/emergency-requests", EmergencyRequestRoutes);
app.use("/api/v1/payments", PaymentRoutes);
app.use("/api/v1/notifications", NotificationRoutes);
app.use("/api/v1/admin", AdminRoutes);



app.get("/", (_req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Emergency Ambulance Dispatch System API is running",
		data: null,
	});
});

app.use(notFound);
app.use(globalErrorHandler);

export default app;
