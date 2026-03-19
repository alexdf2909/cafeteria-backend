import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createInventoryCountController,
    getInventoryCountByIdController,
    getInventoryCountsController,
} from "./inventoryCount.controller";

const router = Router();

router.use(authorize());

router.get("/", getInventoryCountsController);
router.get("/:id", getInventoryCountByIdController);
router.post("/", createInventoryCountController);

export default router;