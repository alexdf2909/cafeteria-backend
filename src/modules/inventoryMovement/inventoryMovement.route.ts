import { Router } from "express";
import { authorize } from "../../middlewares/authorize";
import {
    getMovementsController,
    getStockByItemController,
    getExpiredAlertsController,
    transferStockController,
    adjustStockController,
    damageStockController,
    resolveExpirationController,
} from "./inventoryMovement.controller";

const router = Router();

router.use(authorize());

// ─── Queries ─────────────────────────────────────────────────────────────────
router.get("/", authorize(["admin"]), getMovementsController);
router.get("/expired-alerts", getExpiredAlertsController);
router.get("/stock/:id", getStockByItemController);

// ─── Mutations ───────────────────────────────────────────────────────────────
router.post("/transfer", authorize(["admin", "empleado"]), transferStockController);
router.post("/adjustment", authorize(["admin"]), adjustStockController);
router.post("/damage", authorize(["admin"]), damageStockController);
router.post("/expiration", authorize(["admin", "empleado"]), resolveExpirationController);

export default router;