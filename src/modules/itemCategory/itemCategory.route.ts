import {Router} from "express";
import {
    createItemCategoryController, deleteItemCategoryController,
    getItemCategoriesController, getItemCategoryByIdController, getItemsByCategoryController,
    updateItemCategoryController
} from "./itemCategory.controller";
import {authorize} from "../../middlewares/authorize";

const router = Router();

router.use(authorize());

router.get("/", getItemCategoriesController);
router.post("/", createItemCategoryController);
router.get("/:id", getItemCategoryByIdController);
router.patch("/:id", updateItemCategoryController);
router.delete("/:id", deleteItemCategoryController);
router.get("/:id/items", getItemsByCategoryController);

export default router;