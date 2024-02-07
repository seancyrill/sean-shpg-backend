import express from "express";
import { pool } from "../db";
import { reqTypes } from "types/controllerReqTypes";

// @desc Add item
// @route POST /shops
// @access Private
export async function createShop(req: reqTypes, res: express.Response) {
  try {
    const { user_id, shop_name, shop_email } = req.body;

    // Confirm data
    if (!shop_name || !shop_email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for duplicate shop_name
    const duplicate = await pool.query(
      `SELECT shop_name 
      FROM shops 
      WHERE shop_name = '${shop_name}'`
    );

    if (duplicate.rows.length) {
      return res.status(409).json({ message: "Name has already been used" });
    }

    //create new shop
    const newShop = await pool.query(
      `INSERT INTO shops (
        shop_name, 
        shop_email) 
      VALUES (
        '${shop_name}', 
        '${shop_email}') 
      RETURNING *`
    );

    //link shop to user
    const linkShop = await pool.query(
      `UPDATE users 
      SET shop_id = ${newShop.rows[0].shop_id} 
      WHERE user_id = ${user_id} 
      RETURNING *`
    );
    return res.status(200).json(newShop.rows[0].shop_id);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get shop info
// @route Get /shops/private
// @access Public
export async function getShop(req: reqTypes, res: express.Response) {
  try {
    const { shop_id } = req.query;
    const shopQuery = await pool.query(`
      SELECT 
        s.shop_id,
        s.shop_name,
        s.shop_email,
        s.shop_default_img_id,
        COALESCE(si.img_url, NULL) AS default_img_url
      FROM shops s
      LEFT JOIN shop_imgs si 
        ON s.shop_default_img_id = si.img_id
      WHERE s.shop_id = ${shop_id}
    `);
    const shopInfo = shopQuery.rows[0];

    //checks if shop exist
    if (!shopInfo) {
      return res.status(400).json({ message: "shop does not exist" });
    }

    const itemsQuery = await pool.query(`
      SELECT 
        items.item_id, 
        items.item_name, 
        items.item_desc, 
        items.item_default_img_id,
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url
      FROM items
      LEFT JOIN shops 
        ON items.shop_id = shops.shop_id
      LEFT JOIN promo_items
        ON items.item_id = promo_items.item_id
      LEFT JOIN item_imgs
        ON items.item_default_img_id = item_imgs.img_id
      WHERE items.shop_id = ${shop_id}`);
    const shopItems = itemsQuery.rows;

    //sends shop info AND shop items
    return res.status(200).json({ shopInfo, shopItems });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get shop info
// @route Get /shops
// @access Public
export async function getPublicShop(req: reqTypes, res: express.Response) {
  try {
    const { shop_id } = req.query;
    const shopQuery = await pool.query(
      `
      SELECT 
        s.shop_id,
        s.shop_name,
        s.shop_email,
        s.shop_default_img_id,
        COALESCE(si.img_url, NULL) AS default_img_url,
        (SELECT COUNT(*) FROM items WHERE shop_id = s.shop_id) AS item_count
      FROM shops s
      LEFT JOIN shop_imgs si 
        ON s.shop_default_img_id = si.img_id
      WHERE s.shop_id = $1
    `,
      [shop_id]
    );
    const shopInfo = shopQuery.rows[0];

    //checks if shop exist
    if (!shopInfo) {
      return res.status(400).json({ message: "shop does not exist" });
    }

    //sends shop info AND shop items
    return res.status(200).json(shopInfo);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Update shop name
// @route PATCH /shops/name
// @access Private
export async function updateShopName(req: reqTypes, res: express.Response) {
  try {
    const { shop_name, shop_id } = req.body;

    const duplicate = await pool.query(`
      SELECT * 
      FROM shops
      WHERE shop_name = '${shop_name}'
    `);
    if (duplicate.rows.lenth)
      return res
        .status(401)
        .json({ message: "Shop name has already been used" });

    await pool.query(
      `UPDATE shops 
      SET shop_name = '${shop_name}' 
      WHERE shop_id = ${shop_id}`
    );
    return res.status(200).json({ message: "Shop name updated" });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Update shop email
// @route PATCH /shops/email
// @access Private
export async function updateShopEmail(req: reqTypes, res: express.Response) {
  try {
    const { shop_email, shop_id } = req.body;

    await pool.query(
      `UPDATE shops 
      SET shop_email = '${shop_email}' 
      WHERE shop_id = ${shop_id}`
    );
    return res.status(200).json({ message: "Shop email updated" });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
