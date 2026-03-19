import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {getDashboardController, getIndicatorsByItemController} from "./dashboard.controller";

const router = Router();

router.use(authorize());

router.get("/", getDashboardController);
router.get("/indicators-by-item", getIndicatorsByItemController);

export default router;