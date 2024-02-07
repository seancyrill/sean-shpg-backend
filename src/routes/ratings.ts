import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  getOrdersRating,
  getItemSpecificRating,
  postRating,
} from "../controllers/ratingsController";

const router = express.Router();

router.route("/").get(getItemSpecificRating);

router.use(verifyJWT);

router.route("/").post(postRating);

router.route("/orders").get(getOrdersRating);

module.exports = router;
