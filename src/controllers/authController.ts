import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

type bodyTypes = {
  user_id: number;
  username: string;
  password: string;
  shop_id: number;
};

type reqTypes = express.Request<any, any, bodyTypes, any>;

// @desc Login
// @route POST /auth
// @access Public
export async function login(req: reqTypes, res: express.Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //check username
    const query = await pool.query(`
    SELECT username, password
    FROM users 
    WHERE username = '${username}'`);
    const foundUser = query.rows[0];
    if (!foundUser) {
      return res.status(401).json({ message: "Username does not exist" });
    }
    //check password
    const match = await bcrypt.compare(password, foundUser.password);
    if (!match)
      return res
        .status(401)
        .json({ message: "The password you entered is incorrect" });

    const userQuery = await pool.query(`
      SELECT 
        u.username,
        u.user_id,
        u.user_default_address_id,
        CASE 
          WHEN u.user_default_img_id IS NOT NULL THEN
            json_build_object(
              'img_id', ui.img_id,
              'img_url', ui.img_url,
              'thumbnail_url', ui.thumbnail_url
            ) 
          ELSE NULL
        END AS user_default_img,
        u.shop_id,
        s.shop_name,
        CASE 
          WHEN s.shop_default_img_id IS NOT NULL THEN
            json_build_object(
              'img_id', si.img_id,
              'img_url', si.img_url,
              'thumbnail_url', si.thumbnail_url
            )
          ELSE NULL
        END AS shop_default_img
      FROM users u
      LEFT JOIN 
        shops s ON u.shop_id = s.shop_id
      LEFT JOIN 
        user_imgs ui ON u.user_default_img_id = ui.img_id
      LEFT JOIN 
        shop_imgs si ON s.shop_default_img_id = si.img_id
      WHERE 
        u.username = '${username}'
    `);
    //returns {username, user_id, user_default_img, shop_id, shop_name, shop_default_img}
    const userInfo = userQuery.rows[0];

    const accessToken = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });

    const refreshToken = jwt.sign(
      {
        username: foundUser.username,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Create secure cookie with refresh token
    res.cookie("jwt", refreshToken, {
      httpOnly: true, //accessible only by web server
      secure: true, //https
      sameSite: "none", //cross-site cookie
      maxAge: 7 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT(7d)
    });

    // Send accessToken containing username
    res.json({ accessToken });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
export async function refresh(req: reqTypes, res: express.Response) {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.status(401).json({ message: "No cookie found" });
  }

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async function (err: jwt.VerifyErrors, decoded: bodyTypes) {
      if (err) return res.status(403).json({ message: "Token expired" });

      const userQuery = await pool.query(`
      SELECT 
        u.username,
        u.user_id,
        u.user_default_address_id,
        CASE 
          WHEN u.user_default_img_id IS NOT NULL THEN
            json_build_object(
              'img_id', ui.img_id,
              'img_url', ui.img_url,
              'thumbnail_url', ui.thumbnail_url
            ) 
          ELSE NULL
        END AS user_default_img,
        u.shop_id,
        s.shop_name,
        CASE 
          WHEN s.shop_default_img_id IS NOT NULL THEN
            json_build_object(
              'img_id', si.img_id,
              'img_url', si.img_url,
              'thumbnail_url', si.thumbnail_url
            )
          ELSE NULL
        END AS shop_default_img
      FROM users u
      LEFT JOIN 
        shops s ON u.shop_id = s.shop_id
      LEFT JOIN 
        user_imgs ui ON u.user_default_img_id = ui.img_id
      LEFT JOIN 
        shop_imgs si ON s.shop_default_img_id = si.img_id
      WHERE 
        u.username = '${decoded.username}'
    `);
      //returns {username, user_id, user_default_img, shop_id, shop_name, shop_default_img}
      const userInfo = userQuery.rows[0];

      const accessToken = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });

      res.json({ accessToken });
    }
  );
}

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
export async function logout(req: reqTypes, res: express.Response) {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  res.clearCookie("jwt", { httpOnly: true, sameSite: "none", secure: true });
  res.json({ message: "Cookie cleared" });
}
