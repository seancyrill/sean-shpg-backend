import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  createShop,
  getShop,
  updateShopName,
  updateShopEmail,
  getPublicShop,
} from "../controllers/shopsController";
const router = express.Router();

router.route("/").get(getPublicShop);

router.use(verifyJWT);

router.route("/").post(createShop);
router.route("/private").get(getShop);
router.route("/name").patch(updateShopName);
router.route("/email").patch(updateShopEmail);

module.exports = router;
