import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    createRecipeController, getActivePresentationRecipeController,
    getRecipeByIdController,
    getRecipesController,
} from "./recipe.controller";

const router = Router();

router.use(authorize(["admin"]));

router.get("/", getRecipesController);
router.get("/:id", getRecipeByIdController);
router.post("/", createRecipeController);
router.get("/:id/recipe", getActivePresentationRecipeController);

export default router;