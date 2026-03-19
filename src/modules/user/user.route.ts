import {Router} from "express";
import {getUsersController, getUserByIdController, updateUserController, createUserController} from "./user.controller";
import {authorize} from "../../middlewares/authorize";

const router = Router();

router.use(authorize());

router.get("/", getUsersController);
router.post("/", createUserController);
router.get("/:id", getUserByIdController);
router.patch("/:id", updateUserController);

export default router;