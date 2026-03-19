import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createPurchaseController,
    getPurchaseByIdController,
    getPurchasesController,
} from "./purchase.controller";

const router = Router();

router.use(authorize());

router.get("/", getPurchasesController);
router.get("/:id", getPurchaseByIdController);
router.post("/", createPurchaseController);

export default router;