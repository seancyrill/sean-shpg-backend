import express from "express";
import { pool } from "../db";
import { reqTypes } from "types/controllerReqTypes";

// @desc add promo item
// @route POST /promo
// @access Private
export async function createSinglePromo(req: reqTypes, res: express.Response) {
  try {
    const { shop_id, item_id, discount, start_date, end_date } = req.body;

    // Check for existing promos for the item
    const alreadyOnDiscount = await pool.query(
      `SELECT *
      FROM promo_items 
      WHERE item_id = '${item_id}'`
    );

    if (alreadyOnDiscount.rows.length) {
      //updates promo data
      await pool.query(`
      UPDATE promo_items
      SET 
        discount = ${discount}, 
        start_date = '${start_date}', 
        end_date = '${end_date}'
      WHERE item_id = ${item_id} 
      `);
    } else {
      //create new promo
      await pool.query(
        `INSERT INTO promo_items (
          item_id, 
          shop_id, 
          discount,
          start_date, 
          end_date)
        VALUES (
          ${item_id},
          ${shop_id},
          ${discount},
          '${start_date}',
          '${end_date}')`
      );
    }

    return res
      .status(200)
      .json({ message: `Successfully added promo to item with ID ${item_id}` });
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
