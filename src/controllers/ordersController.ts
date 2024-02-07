import express from "express";
import { pool } from "../db";
import { reqTypes } from "../types/controllerReqTypes";

// @desc Get user orders
// @route GET /order
// @access Private
export async function getOrders(req: reqTypes, res: express.Response) {
  try {
    const { user_id } = req.query;
    const query = await pool.query(
      `SELECT * 
      FROM orders 
      WHERE user_id = ${user_id}`
    );

    //sends user data
    return res.status(200).json(query.rows);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get single order
// @route GET /order/:id
// @access Private
export async function getSingleOrder(req: reqTypes, res: express.Response) {
  try {
    const { user_id } = req.query;
    const { order_id } = req.params;

    const query = await pool.query(
      `SELECT * 
      FROM orders 
      WHERE order_id = ${order_id} 
        AND user_id = ${user_id}`
    );

    //sends user data
    return res.status(200).json(query.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc User places an order
// @route POST /order
// @access Private
export async function placeOrder(req: reqTypes, res: express.Response) {
  try {
    const { user_id, orderItems, selectedAddress } = req.body;
    await pool.query(
      `INSERT INTO orders (order_items, order_address, user_id ) 
      VALUES (
        '${JSON.stringify(orderItems)}', 
        '${JSON.stringify(selectedAddress)}', 
        ${user_id})`
    );
    //only returns confirmation, user is redirected to orders page
    return res.sendStatus(200);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc User an cancels order
// @route DELETE /order
// @access Private
export async function cancelOrder(req: reqTypes, res: express.Response) {
  try {
    const { order_id, user_id } = req.body;
    const success = await pool.query(
      `DELETE FROM orders 
      WHERE 
        order_id = ${order_id} AND
        user_id = (
          SELECT user_id 
          FROM orders 
          WHERE order_id = ${order_id}
        )`
    );

    if (success) {
      const shopItems = await pool.query(
        `SELECT *
        FROM orders
        WHERE user_id = ${user_id}`
      );

      //returns updated list of orders back
      return res.status(200).json(shopItems.rows);
    }
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
