import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";
import {
  deleteAddress,
  getAddress,
  postAddress,
  setAsDefaultAddress,
  updateAddress,
} from "../controllers/addressControllers";

const router = express.Router();

router.use(verifyJWT);

router
  .route("/")
  .get(getAddress)
  .post(postAddress)
  .patch(updateAddress)
  .delete(deleteAddress);

router.route("/default").patch(setAsDefaultAddress);

module.exports = router;
