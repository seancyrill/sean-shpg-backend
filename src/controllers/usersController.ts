import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db";
import { reqTypes } from "../types/controllerReqTypes";

// @desc Register user
// @route POST /users
// @access Public
export async function register(req: reqTypes, res: express.Response) {
  try {
    const { username, password } = req.body;

    // Confirm data
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for duplicate username
    const duplicate = await pool.query(
      `SELECT username 
      FROM users 
      WHERE username = '${username}'`
    );

    if (duplicate.rows.length) {
      return res.status(409).json({ message: "Duplicate username" });
    }

    // Hash password
    const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

    // Create and store new user
    const createQuery = await pool.query(
      `INSERT INTO users (
        username, 
        password) 
      VALUES (
        '${username}', 
        '${hashedPwd}') 
      RETURNING user_id`
    );
    const { user_id } = createQuery.rows[0];
    console.log(user_id);

    res.status(201).json(user_id);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Updates password
// @route PATCH /users/password
// @access Private
export async function updatePassword(req: reqTypes, res: express.Response) {
  try {
    const { password, user_id, newPassword } = req.body;

    //compares both pw
    if (password === newPassword) {
      return res.status(401).json({
        message: "Current password and new password cannot be the same",
      });
    }

    //find user on db
    const userData = await pool.query(
      `SELECT * 
      FROM users 
      WHERE user_id = ${user_id}`
    );
    const foundUser = userData.rows[0];
    if (!foundUser) {
      return res.status(401).json({ message: "Account does not exist" });
    }

    //check current password
    const match = await bcrypt.compare(password, foundUser.password);
    if (!match)
      return res
        .status(401)
        .json({ message: "The current password you entered is incorrect" });

    // Hash password
    const hashedPwd = await bcrypt.hash(newPassword, 10); // salt rounds

    const changePwQuery = await pool.query(
      `UPDATE users 
      SET password = '${hashedPwd}' 
      WHERE user_id = ${user_id}`
    );
    return res.status(200).json("Password successfully updated");
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get user cart
// @route GET /users/cart
// @access Private
export async function getCart(req: reqTypes, res: express.Response) {
  try {
    const { user_id } = req.query;
    const query = await pool.query(
      `SELECT user_cart 
      FROM users 
      WHERE user_id = ${user_id}`
    );
    return res.status(200).json(query.rows[0]?.user_cart);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Updates user cart
// @route PATCH /users/cart
// @access Private
export async function updateCart(req: reqTypes, res: express.Response) {
  try {
    const { user_id, cartArray } = req.body;
    console.log(cartArray);
    const query = await pool.query(
      `UPDATE users 
      SET user_cart = '${JSON.stringify(cartArray)}' 
      WHERE user_id = ${user_id} 
      RETURNING user_cart`
    );
    return res.status(200).json(query.rows[0]);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
