import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createItemSupplierController,
    updateItemSupplierController,
} from "./itemSupplier.controller";

const router = Router();

router.use(authorize());

router.post("/", createItemSupplierController);
router.patch("/:id", updateItemSupplierController);

export default router;