import {Router} from "express";
import {authorize} from "../../middlewares/authorize";
import {
    createItemPackageController,
    getItemPackageByIdController, getItemPackagesController, getSuppliersByItemPackageController,
    updateItemPackageController
} from "./itemPackage.controller";

const router = Router();

router.use(authorize());

router.get("/", getItemPackagesController);
router.post("/", createItemPackageController);
router.patch("/:id", updateItemPackageController);
router.get("/:id", getItemPackageByIdController);
router.get("/:id/proveedores", getSuppliersByItemPackageController);

export default router;