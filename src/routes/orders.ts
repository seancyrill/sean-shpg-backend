import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  placeOrder,
  cancelOrder,
  getOrders,
  getSingleOrder,
} from "../controllers/ordersController";

const router = express.Router();

router.use(verifyJWT);

router.route("/").get(getOrders).post(placeOrder).delete(cancelOrder);

router.route("/:order_id").get(getSingleOrder);

module.exports = router;
