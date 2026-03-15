import {Router} from "express";
import {authorize} from "../../middlewares/authorize";
import {
    createSupplierController, getItemPackagesBySupplierController,
    getSupplierByIdController,
    getSuppliersController,
    updateSupplierController
} from "./supplier.controller";

const router = Router();

router.use(authorize());

router.get("/", getSuppliersController);
router.post("/", createSupplierController);
router.get("/:id", getSupplierByIdController);
router.patch("/:id", updateSupplierController);
router.get("/:id/item-packages", getItemPackagesBySupplierController);

export default router;