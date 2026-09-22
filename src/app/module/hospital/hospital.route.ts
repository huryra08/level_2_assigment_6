import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { HospitalController } from "./hospital.controller";
import { HospitalValidation } from "./hospital.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";

const router = Router();

router.post(
	"/",
	auth(Role.ADMIN),
	validateRequest(HospitalValidation.CreateHospitalZodSchema),
	HospitalController.createHospital,
);


router.get("/", auth(Role.ADMIN, Role.DRIVER, Role.USER), HospitalController.getAllHospitals);

router.get("/:hospitalId", auth(Role.ADMIN, Role.DRIVER, Role.USER), HospitalController.getSingleHospital);

router.patch(
	"/:hospitalId",
	auth(Role.ADMIN),
	validateRequest(HospitalValidation.UpdateHospitalZodSchema),
	HospitalController.updateHospital,
);

router.delete("/:hospitalId", auth(Role.ADMIN), HospitalController.softDeleteHospital);

export const HospitalRoutes = router;
