import { createSinglePromo, deletePromo } from "../controllers/promoController";
import express from "express";
import { verifyJWT } from "../middleware/verifyJWT";

const router = express.Router();

router.use(verifyJWT);

router.route("/").post(createSinglePromo).delete(deletePromo);

module.exports = router;
