import { Router } from "express";
//import { Role } from "../../../generated/prisma";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { DriverController } from "./driver.controller";
import { DriverValidation } from "./driver.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";
import { upload } from "../../middleware/upload";


const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(DriverValidation.CreateDriverZodSchema),
	DriverController.createDriver,
);

router.get("/", auth(Role.ADMIN), DriverController.getAllDrivers);

router.get("/me", auth(Role.DRIVER), DriverController.getMyDriverProfile);

router.patch(
	"/me/availability",
	auth(Role.DRIVER),
	validateRequest(DriverValidation.UpdateAvailabilityZodSchema),
	DriverController.updateMyAvailability,
);

router.patch(
	"/me/location",
	auth(Role.DRIVER),
	validateRequest(DriverValidation.UpdateLocationZodSchema),
	DriverController.updateMyLocation,
);

router.get("/:driverId", auth(Role.ADMIN), DriverController.getSingleDriver);

router.patch(
	"/:driverId",
	auth(Role.ADMIN),
	validateRequest(DriverValidation.UpdateDriverZodSchema),
	DriverController.updateDriver,
);

router.patch(
	"/:driverId/verify",
	auth(Role.ADMIN),
	validateRequest(DriverValidation.VerifyDriverZodSchema),
	DriverController.verifyDriver,
);

router.patch(
	"/me/license-photo",
	auth(Role.DRIVER),
	upload.single("licensePhoto"),
	DriverController.updateMyLicensePhoto,
);

router.delete("/:driverId", auth(Role.ADMIN), DriverController.softDeleteDriver);

export const DriverRoutes = router;
