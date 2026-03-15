import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import { getDashboardController } from "./dashboard.controller";

const router = Router();

router.use(authorize(["admin"]));

router.get("/", getDashboardController);

export default router;