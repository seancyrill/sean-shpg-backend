import express from "express";
import { pool } from "../db";
import { deleteImgS3, getSignedURL } from "../s3";
import { RelevantTableType, reqTypes } from "../types/controllerReqTypes";

// @desc Requests signedUrl for uploading img directly from client
// @route PUT /imgs/items
// @access Private
export async function handleSignedUrlReq(req: reqTypes, res: express.Response) {
  try {
    const { relevantId, relevantTable, rounds } = req.body;
    const signedUrl = await getSignedURL(relevantId, relevantTable, rounds);
    return res.status(200).send(signedUrl);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Adds new img url to an item after SUCCESSFULLY adding to s3
// @route POST /imgs/items
// @access Private
export async function addImgToDb(req: reqTypes, res: express.Response) {
  try {
    const { relevantId, relevantTable, newImgUrlArr } = req.body;
    const origBucket = process.env.AWS_BUCKET_NAME;
    const thumbBucket = process.env.AWS_THUMBNAIL_BUCKET_NAME;

    const withoutS = relevantTable.slice(0, -1);
    const dbName = `${withoutS}_imgs`;
    const colName = `${withoutS}_id`;

    //create a chain of strings for db values
    const insertVal = newImgUrlArr
      .map((img_url) => {
        const thumbnail_url = img_url.replace(origBucket, thumbBucket);
        return `('${img_url}', '${thumbnail_url}', ${relevantId})`;
      })
      .join(", ");

    const addRequest = await pool.query(`
      INSERT INTO ${dbName} (
        img_url,
        thumbnail_url,
        ${colName})
      VALUES ${insertVal}
      RETURNING img_id
    `);
    const addedIds = addRequest.rows;

    return res.status(200).send(addedIds);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get item imgs
// @route Get /imgs/items
// @access PUBLIC
export async function getItemImgs(req: reqTypes, res: express.Response) {
  try {
    const { item_id } = req.query;

    const imgQuery = await pool.query(`
      SELECT *
      FROM item_imgs
      WHERE item_id = ${item_id}
    `);
    const item_imgs = imgQuery.rows;
    return res.status(200).json({ item_imgs });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Set an img_id as the item_default_img
// @route PATCH /imgs/items
// @access Private
export async function setItemDefaultImg(req: reqTypes, res: express.Response) {
  try {
    const { img_id, item_id, shop_id } = req.body;

    await pool.query(`
      UPDATE items 
      SET item_default_img_id = ${img_id}
      WHERE item_id = ${item_id} 
      AND shop_id = ${shop_id}`);

    return res.status(200).json({
      success: `Successfully set img with ID ${img_id} as a default image for item with ID ${item_id}`,
    });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Deletes an img from db and s3
// @route DELETE /imgs/items
// @access Private
export async function deleteItemImg(req: reqTypes, res: express.Response) {
  try {
    const { relevantId, img } = req.body;

    if (!img) return res.status(400).json({ failure: "No image attached" });

    const { img_id, img_url } = img;

    //check if img belongs to id sent
    const confirmQuery = await pool.query(`
      SELECT img_id
      FROM item_imgs
      WHERE img_id = ${img_id} 
      AND item_id = ${relevantId}
    `);
    const confirmed = confirmQuery.rows.length > 0;
    if (!confirmed) {
      return res
        .status(400)
        .json({ failure: "Deleting this image is not allowed" });
    }

    //delete from db first
    if (confirmed) {
      await pool.query(`
      DELETE FROM item_imgs
      WHERE img_id = ${img_id}
    `);
    }

    //delete from s3
    await deleteImgS3(img_url, "items");

    const imgQuery = await pool.query(`
      SELECT 
        img_id,
        img_url
      FROM item_imgs
      WHERE item_id = ${relevantId}
    `);
    const item_imgs = imgQuery.rows;

    return res.status(200).json({ item_imgs });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get user imgs
// @route Get /imgs/users
// @access PRIVATE
export async function getUserImgs(req: reqTypes, res: express.Response) {
  try {
    const { user_id } = req.query;

    const imgQuery = await pool.query(`
      SELECT *
      FROM user_imgs
      WHERE user_id = ${user_id}
    `);
    const user_imgs = imgQuery.rows;
    return res.status(200).json(user_imgs);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Set an img_id as the user_default_img
// @route PATCH /imgs/users
// @access Private
export async function setUserDefaultImg(req: reqTypes, res: express.Response) {
  try {
    const { img_id, user_id } = req.body;

    await pool.query(`
      UPDATE users 
      SET user_default_img_id = ${img_id}
      WHERE user_id = ${user_id}
    `);

    return res.status(200).json({
      success: `Successfully set img with ID ${img_id} as a default image for user with ID ${user_id}`,
    });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Deletes an img from db and s3
// @route DELETE /imgs/users
// @access Private
export async function deleteUserImg(req: reqTypes, res: express.Response) {
  try {
    const { relevantId, img } = req.body;

    if (!img) return res.status(400).json({ failure: "No image attached" });

    const { img_id, img_url } = img;

    //check if img belongs to id sent
    const confirmQuery = await pool.query(`
      SELECT img_id
      FROM user_imgs
      WHERE img_id = ${img_id} 
      AND user_id = ${relevantId}
    `);
    const confirmed = confirmQuery.rows.length > 0;
    if (!confirmed) {
      return res
        .status(400)
        .json({ failure: "Deleting this image is not allowed" });
    }

    //delete from db first
    if (confirmed) {
      await pool.query(`
      DELETE FROM user_imgs
      WHERE img_id = ${img_id}
    `);
    }

    //delete from s3
    await deleteImgS3(img_url, "users");

    const imgQuery = await pool.query(`
      SELECT 
        img_id,
        img_url
      FROM user_imgs
      WHERE user_id = ${relevantId}
    `);
    const user_imgs = imgQuery.rows;

    return res.status(200).json({ user_imgs });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get shop imgs
// @route Get /imgs/shops
// @access PRIVATE
export async function getShopImgs(req: reqTypes, res: express.Response) {
  try {
    const { shop_id } = req.query;

    const imgQuery = await pool.query(`
      SELECT *
      FROM shop_imgs
      WHERE shop_id = ${shop_id}
    `);
    const shop_imgs = imgQuery.rows;
    return res.status(200).json(shop_imgs);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Set an img_id as the shop_default_img
// @route PATCH /imgs/shops
// @access Private
export async function setShopDefaultImg(req: reqTypes, res: express.Response) {
  try {
    const { img_id, shop_id } = req.body;

    await pool.query(`
      UPDATE shops 
      SET shop_default_img_id = ${img_id}
      WHERE shop_id = ${shop_id}
    `);

    return res.status(200).json({
      success: `Successfully set img with ID ${img_id} as a default image for user with ID ${shop_id}`,
    });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Deletes an img from db and s3
// @route DELETE /imgs/shops
// @access Private
export async function deleteShopImg(req: reqTypes, res: express.Response) {
  try {
    const { relevantId, img } = req.body;

    if (!img) return res.status(400).json({ failure: "No image attached" });

    const { img_id, img_url } = img;

    //check if img belongs to id sent
    const confirmQuery = await pool.query(`
      SELECT img_id
      FROM shop_imgs
      WHERE img_id = ${img_id} 
      AND shop_id = ${relevantId}
    `);
    const confirmed = confirmQuery.rows.length > 0;
    if (!confirmed) {
      return res
        .status(400)
        .json({ failure: "Deleting this image is not allowed" });
    }

    //delete from db first
    if (confirmed) {
      await pool.query(`
      DELETE FROM shop_imgs
      WHERE img_id = ${img_id}
    `);
    }

    //delete from s3
    await deleteImgS3(img_url, "shops");

    const imgQuery = await pool.query(`
      SELECT 
        img_id,
        img_url
      FROM shop_imgs
      WHERE shop_id = ${relevantId}
    `);
    const shop_imgs = imgQuery.rows;

    return res.status(200).json({ shop_imgs });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
