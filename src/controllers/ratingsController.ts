import express from "express";
import { pool } from "../db";
import { reqTypes } from "types/controllerReqTypes";

// @desc get rating to items in an order
// @route GET /ratings
// @access Private
export async function getItemSpecificRating(
  req: reqTypes,
  res: express.Response
) {
  try {
    const { item_id, rating_score } = req.query;

    const query = await pool.query(
      `
      SELECT DISTINCT 
        r.*,
        u.username,
        ui.thumbnail_url
      FROM 
          ratings r
          INNER JOIN users u ON r.user_id = u.user_id
          LEFT JOIN user_imgs ui ON u.user_default_img_id = ui.img_id
      WHERE 
          r.item_id = $1
          AND r.rating_score = $2
      LIMIT 4;
      `,
      [item_id, rating_score]
    );
    const result = query.rows;

    return res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc get rating to items in an order
// @route GET /ratings/orders
// @access Private
export async function getOrdersRating(req: reqTypes, res: express.Response) {
  try {
    const { id_list, user_id } = req.query;

    if (!id_list.length || !user_id)
      return res.status(401).json({ message: "incomplete data" });
    const placeholders = id_list.map((_, index) => `$${index + 2}`).join(", ");

    const query = await pool.query(
      `
      SELECT r.*, u.username
      FROM ratings r
      INNER JOIN users u ON r.user_id = u.user_id
      WHERE r.user_id = $1
        AND r.item_id IN (${placeholders})
      `,
      [user_id, ...id_list]
    );
    const result = query.rows;

    return res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc add rating to an item
// @route POST /ratings
// @access Private
export async function postRating(req: reqTypes, res: express.Response) {
  try {
    const { newRating, item_id, user_id } = req.body;
    const { rating_comment, rating_score, rating_summary } = newRating;

    if (!rating_comment || !rating_score || !rating_summary) return;

    const query = await pool.query(
      `
      INSERT INTO ratings (
        rating_score,
        rating_summary,
        rating_comment,
        user_id,
        item_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `,
      [rating_score, rating_summary, rating_comment, user_id, item_id]
    );
    const result = query.rows;

    return res.status(200).json(result);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

export async function deletePromo(req: reqTypes, res: express.Response) {
  try {
    const { item_id, shop_id } = req.body;

    await pool.query(`
    DELETE FROM promo_items
    WHERE item_id = ${item_id}`);

    return res.status(200).json({ message: `Successfully delete promo` });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
