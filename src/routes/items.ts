import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  postItem,
  getMultiItems,
  updateItem,
  deleteItem,
  getItem,
  getCartItemsInfo,
  getSearchedItems,
} from "../controllers/itemsController";
const router = express.Router();

router
  .route("/")
  .get(getMultiItems)
  .post(verifyJWT, postItem)
  .patch(verifyJWT, updateItem)
  .delete(verifyJWT, deleteItem);

router.route("/cart").get(getCartItemsInfo);

router.route("/imgs");

router.route("/search/:searchParams").get(getSearchedItems);
router.route("/:item_id").get(getItem);

module.exports = router;
