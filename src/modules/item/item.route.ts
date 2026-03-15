import { Router } from "express";
import {
    createItemController,
    getItemByIdController, getItemPackagesByItemController,
    getItemsController,
    getItemStockController,
    updateItemController
} from "./item.controller";
import {authorize} from "../../middlewares/authorize";

const router = Router();

router.use(authorize());

router.get("/", getItemsController);
router.post("/", createItemController);
router.get("/:id", getItemByIdController);
router.patch("/:id", updateItemController);
router.get("/:id/stock", getItemStockController);
router.get("/:id/packages", getItemPackagesByItemController);

export default router;