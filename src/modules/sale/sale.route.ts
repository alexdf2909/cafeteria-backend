import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createSaleController,
    getSaleByIdController,
    getSalesController,
} from "./sale.controller";

const router = Router();

router.use(authorize());

router.get("/", authorize(["admin"]), getSalesController);
router.get("/:id", authorize(["admin"]), getSaleByIdController);
router.post("/", createSaleController);

export default router;