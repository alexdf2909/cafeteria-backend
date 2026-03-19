import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createProductController,
    createPresentationController,
    getProductByIdController,
    getProductsController,
    updateProductController,
    updatePresentationController, getPresentationByIdController,
} from "./product.controller";
import {getActivePresentationRecipeController} from "../recipe/recipe.controller";

const router = Router();

router.use(authorize());

// ─── Product ─────────────────────────────────────────────────────────────────
router.get("/", getProductsController);
router.post("/", createProductController);
router.get("/:id", getProductByIdController);
router.patch("/:id", updateProductController);

// ─── Product Presentation ────────────────────────────────────────────────────
router.get("/presentations/:id", getPresentationByIdController);
router.post("/:id/presentations", createPresentationController);
router.patch("/presentations/:id", updatePresentationController);
router.get("/presentations/:id/recipe", getActivePresentationRecipeController);

export default router;