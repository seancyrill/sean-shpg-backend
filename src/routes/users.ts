import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  register,
  //getProfile,
  updatePassword,
  updateCart,
  getCart,
} from "../controllers/usersController";

const router = express.Router();

router.route("/").post(register);

router.route("/cart").get(getCart).patch(updateCart);

router.use(verifyJWT);

router.route("/password").patch(updatePassword);

module.exports = router;
