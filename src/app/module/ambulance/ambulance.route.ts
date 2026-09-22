import { Router } from "express";
//import { Role } from "../../../generated/prisma";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AmbulanceController } from "./ambulance.controller";
import { AmbulanceValidation } from "./ambulance.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(AmbulanceValidation.CreateAmbulanceZodSchema),
	AmbulanceController.createAmbulance,
);

router.get("/", auth(Role.ADMIN, Role.DRIVER), AmbulanceController.getAllAmbulances);

router.get("/:ambulanceId", auth(Role.ADMIN, Role.DRIVER), AmbulanceController.getSingleAmbulance);

router.patch(
	"/:ambulanceId",
	auth(Role.ADMIN),
	validateRequest(AmbulanceValidation.UpdateAmbulanceZodSchema),
	AmbulanceController.updateAmbulance,
);

router.delete("/:ambulanceId", auth(Role.ADMIN), AmbulanceController.softDeleteAmbulance);

export const AmbulanceRoutes = router;
