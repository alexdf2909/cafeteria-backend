import {Router} from "express";
import {
    createProductCategoryController, deleteProductCategoryController,
    getProductCategoriesController, getProductCategoryByIdController, getProductsByCategoryController,
    updateProductCategoryController
} from "./productCategory.controller";
import {authorize} from "../../middlewares/authorize";

const router = Router();

router.use(authorize());

router.get("/", getProductCategoriesController);
router.post("/", createProductCategoryController);
router.get("/:id", getProductCategoryByIdController);
router.patch("/:id", updateProductCategoryController);
router.delete("/:id", deleteProductCategoryController);
router.get("/:id/products", getProductsByCategoryController);

export default router;