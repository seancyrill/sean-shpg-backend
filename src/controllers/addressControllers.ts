import express from "express";
import { pool } from "../db";
import { reqTypes } from "../types/controllerReqTypes";

async function getAddressData(user_id: number) {
  const addressQuery = await pool.query(
    `SELECT *
    FROM addresses 
    WHERE user_id = ${user_id}`
  );
  const addressData = addressQuery.rows;

  //sends user addresses in an array
  return addressData;
}

async function setDefaultQuery(address_id: number, user_id: number) {
  const query = await pool.query(`
  UPDATE users 
  SET  
    user_default_address_id = '${address_id}'
  WHERE user_id = ${user_id}
  `);
  return query;
}

// @desc Get user addresses
// @route Get /users/address
// @access Private
export async function getAddress(req: reqTypes, res: express.Response) {
  try {
    const { user_id } = req.query;
    const addressData = await getAddressData(user_id);

    //sends user data
    return res.status(200).json(addressData);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc post a new address
// @route POST /address
// @access Private
export async function postAddress(req: reqTypes, res: express.Response) {
  try {
    const { user_address, user_id, toDefault } = req.body;
    const {
      address_label,
      address_name,
      address_number,
      address_postal,
      address_region,
      address_street,
    } = user_address;
    console.log(address_label);

    const addQuery = await pool.query(`
      INSERT INTO addresses (
        user_id,
        address_number,
        address_name,
        address_region,
        address_street,
        address_postal,
        address_label
        ) 
      VALUES (
        ${user_id}, 
        ${address_number}, 
        '${address_name}', 
        '${address_region}',
        '${address_street}',
        '${address_postal}',
        '${address_label}')
      RETURNING address_id
      `);
    const { address_id } = addQuery.rows[0];

    //check if user sets address as default
    if (toDefault) {
      setDefaultQuery(address_id, user_id);
    }

    const addressData = await getAddressData(user_id);

    //sends new address
    return res.status(200).json(addressData);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc update an address
// @route PATCH /address
// @access Private
export async function updateAddress(req: reqTypes, res: express.Response) {
  try {
    const { user_address, address_id, user_id, toDefault } = req.body;
    const {
      address_label,
      address_name,
      address_number,
      address_postal,
      address_region,
      address_street,
    } = user_address;

    const success = await pool.query(`
    UPDATE addresses 
    SET 
      address_name = '${address_name}', 
      address_number = '${address_number}', 
      address_region = '${address_region}', 
      address_postal = '${address_postal}', 
      address_street = '${address_street}', 
      address_label = '${address_label}'
    WHERE address_id = ${address_id} 
      AND user_id = ${user_id}`);

    //check if user sets address as default
    if (toDefault) {
      setDefaultQuery(address_id, user_id);
    }

    const addressData = await getAddressData(user_id);

    //sends new address
    return res.status(200).json(addressData);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc delete address
// @route DELETE /address
// @access Private
export async function deleteAddress(req: reqTypes, res: express.Response) {
  try {
    const { address_id, user_id } = req.body;

    await pool.query(`
    DELETE FROM addresses
    WHERE address_id = ${address_id}`);

    const addressData = await getAddressData(user_id);

    //sends new address
    return res.status(200).json(addressData);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc set an adress as default
// @route patch /address/default
// @access Private
export async function setAsDefaultAddress(
  req: reqTypes,
  res: express.Response
) {
  try {
    const { address_id, user_id } = req.body;

    await setDefaultQuery(address_id, user_id);

    return res
      .status(200)
      .json({ message: "Address successfull set to default" });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
