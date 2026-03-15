import {Router} from "express";
import {authorize} from "../../middlewares/authorize";
import {
    createItemPackageController,
    getItemPackageByIdController, getSuppliersByItemPackageController,
    updateItemPackageController
} from "./itemPackage.controller";

const router = Router();

router.use(authorize());

router.post("/", createItemPackageController);
router.put("/:id", updateItemPackageController);
router.get("/:id", getItemPackageByIdController);
router.get("/:id/proveedores", getSuppliersByItemPackageController);

export default router;