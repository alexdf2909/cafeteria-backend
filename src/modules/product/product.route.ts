import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createProductController,
    createPresentationController,
    getProductByIdController,
    getProductsController,
    updateProductController,
    updatePresentationController,
} from "./product.controller";

const router = Router();

router.use(authorize(["admin"]));

// ─── Product ─────────────────────────────────────────────────────────────────
router.get("/", getProductsController);
router.post("/", createProductController);
router.get("/:id", getProductByIdController);
router.patch("/:id", updateProductController);

// ─── Product Presentation ────────────────────────────────────────────────────
router.post("/:id/presentations", createPresentationController);
router.patch("/presentations/:id", updatePresentationController);

export default router;