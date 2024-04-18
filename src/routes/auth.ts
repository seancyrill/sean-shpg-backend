import express from "express";
import { login, logout, refresh } from "../controllers/authController";
import { loginLimiter } from "../middleware/loginLimiter";
const router = express.Router();

router.use(loginLimiter);

router.route("/").post(login);
router.route("/refresh").get(refresh);
router.route("/logout").post(logout);

module.exports = router;
