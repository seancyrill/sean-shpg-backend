import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  addImgToDb,
  handleSignedUrlReq,
  deleteItemImg,
  setItemDefaultImg,
  getItemImgs,
  getUserImgs,
  setUserDefaultImg,
  deleteUserImg,
  getShopImgs,
  setShopDefaultImg,
  deleteShopImg,
} from "../controllers/imgsController";

const router = express.Router();

router.use(verifyJWT);

router.route("/").put(handleSignedUrlReq).post(addImgToDb);

router
  .route("/items")
  .get(getItemImgs)
  .patch(setItemDefaultImg)
  .delete(deleteItemImg);

router
  .route("/users")
  .get(getUserImgs)
  .patch(setUserDefaultImg)
  .delete(deleteUserImg);

router
  .route("/shops")
  .get(getShopImgs)
  .patch(setShopDefaultImg)
  .delete(deleteShopImg);

module.exports = router;
