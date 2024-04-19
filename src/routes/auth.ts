import express from "express";
import {
  googleLogin,
  login,
  logout,
  refresh,
} from "../controllers/authController";
import { loginLimiter } from "../middleware/loginLimiter";
const router = express.Router();

router.route("/refresh").get(refresh);
router.route("/logout").post(logout);

router.route("/google").post(googleLogin);

router.use(loginLimiter);

router.route("/").post(login);
module.exports = router;
