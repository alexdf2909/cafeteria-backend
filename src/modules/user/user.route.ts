import {Router} from "express";
import {getUsersController, getUserByIdController, updateUserController, createUserController} from "./user.controller";
import {authorize} from "../../middlewares/authorize";

const router = Router();

router.use(authorize());

router.get("/", authorize(["admin"]), getUsersController);
router.post("/", authorize(["admin"]), createUserController);
router.get("/:id", authorize(["admin", "empleado"]), getUserByIdController);
router.patch("/:id", authorize(["admin", "empleado"]), updateUserController);

export default router;