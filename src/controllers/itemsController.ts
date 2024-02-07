import express from "express";
import { pool } from "../db";
import {
  AttributeType,
  ItemImgType,
  TagType,
  reqTypes,
} from "types/controllerReqTypes";
import { deleteImgS3 } from "../s3";

async function handleTags(item_tags: string[], item_id: number) {
  //create a chain of strings for db values, then check if it exists
  const tagQuery = await pool.query(`
    SELECT *
    FROM tags 
    WHERE tag_name 
      IN (${item_tags.map((tagname) => `'${tagname}'`).join(", ")})
  `);
  const existingTags: TagType[] = tagQuery.rows;
  const newTags = item_tags.filter(
    (tag) => !existingTags?.some(({ tag_name }) => tag_name === tag)
  );

  // Array to store tag IDs
  let tagIdList = [];

  //process existing tags
  if (existingTags?.length) {
    // Check and add missing relations for tags with the item
    const existingRelationsQuery = await pool.query(`
    SELECT tag_id
    FROM items_tags_junction
    WHERE item_id = ${item_id}
    `);
    const existingRelations: TagType[] = existingRelationsQuery.rows;
    //filter existingTags, removes existingRelations.
    const missingRelations = existingTags.filter((existingTag) => {
      return !existingRelations.some(
        (existingRelation) => existingRelation.tag_id === existingTag.tag_id
      );
    });

    tagIdList.push(...missingRelations?.map(({ tag_id }) => tag_id));

    //cleans up removed tags
    const removedRelations = existingRelations.filter((existingRelation) => {
      return !existingTags.some(
        (existingTag) => existingTag.tag_id === existingRelation.tag_id
      );
    });
    if (removedRelations.length) {
      await pool.query(`
        DELETE FROM items_tags_junction
        WHERE item_id = ${item_id}
          AND tag_id IN (${removedRelations
            .map((tag) => `'${tag.tag_id}'`)
            .join(", ")})
      `);
    }
  }

  // If there are new tags, insert them into the db
  if (newTags.length) {
    const newTagQuery = await pool.query(`
    INSERT INTO tags (tag_name)
    VALUES ${newTags.map((tag) => `('${tag}')`).join(", ")}
    RETURNING tag_id
    `);
    // Retrieve the inserted tag IDs
    const newTagIds: TagType[] = newTagQuery.rows;
    tagIdList.push(...newTagIds?.map((row) => row.tag_id));
  }

  // add relations to item_id and ids processed in tagIdList
  if (tagIdList.length) {
    await pool.query(`
      INSERT INTO items_tags_junction (item_id, tag_id)
      VALUES ${tagIdList.map((tagId) => `(${item_id}, ${tagId})`).join(", ")}
    `);
  }
}

async function handleAttributes(
  item_attributes: AttributeType[],
  item_id: number
) {
  //fetch existing attr attached to item
  const attrQuery = await pool.query(`
    SELECT *
    FROM attributes
    WHERE item_id = ${item_id}
  `);
  const attrData: AttributeType[] = attrQuery.rows;

  if (!item_attributes || !item_attributes.length) {
    //deletes all attr
    if (attrData.length) {
      const deleteAll = await pool.query(`
        DELETE FROM attributes
        WHERE item_id = ${item_id}
      `);
      return deleteAll;
    }

    //exits function when no new AND existing attributes
    return;
  }

  //remove existing attrs not passed in
  const removedAttrs = attrData.filter((existingAttr) => {
    return !item_attributes.some(
      (attr) =>
        attr.attribute_name === existingAttr.attribute_name &&
        attr.attribute_value === existingAttr.attribute_value
    );
  });
  if (removedAttrs.length) {
    const removeVal = removedAttrs
      .map((attr) => {
        return `(item_id = ${item_id} AND attribute_name = '${attr.attribute_name}' AND attribute_value = '${attr.attribute_value}')`;
      })
      .join(" OR ");

    await pool.query(`
    DELETE FROM attributes
    WHERE ${removeVal}
    `);
  }

  //add new attrs
  const newAttr = item_attributes.filter(
    ({ attribute_name, attribute_value }) =>
      !attrData.some(
        (attr) =>
          attr.attribute_name === attribute_name &&
          attr.attribute_value === attribute_value
      )
  );
  if (newAttr.length) {
    const insertVal = newAttr
      .map(
        ({ attribute_name, attribute_value }) =>
          `(${item_id}, '${attribute_name}', '${attribute_value}')`
      )
      .join(", ");
    await pool.query(`
      INSERT INTO attributes (item_id, attribute_name, attribute_value)
      VALUES ${insertVal}
    `);
  }
}

// @desc Get item info
// @route Get /items
// @access Public
export async function getItem(req: reqTypes, res: express.Response) {
  try {
    const { item_id } = req.params;
    const itemQuery = await pool.query(
      `
      SELECT 
        i.item_id, 
        i.item_name, 
        i.item_desc, 
        i.item_default_img_id,
        i.item_price, 
        i.shop_id, 
        s.shop_name,
        pi.discount,
        pi.start_date,
        pi.end_date,
        AVG(r.rating_score) AS average_score,
        (
          SELECT json_agg(to_jsonb(r2.*))
          FROM (
              SELECT DISTINCT 
                  r.*,
                  u.username,
                  ui.thumbnail_url
              FROM 
                  ratings r
                  INNER JOIN users u ON r.user_id = u.user_id
                  LEFT JOIN user_imgs ui ON u.user_default_img_id = ui.img_id
              WHERE 
                  r.item_id = i.item_id
              LIMIT 4
          ) r2
        ) AS latest_reviews,
        (
          SELECT json_agg(to_jsonb(r.rating_score))
          FROM ratings r
          WHERE i.item_id = r.item_id
        ) AS rating_tally,
        (
          SELECT json_agg(to_jsonb(ii.*))
          FROM item_imgs ii
          WHERE i.item_id = ii.item_id
        ) AS item_imgs,
        (
          SELECT ARRAY_AGG(tags.tag_name)
          FROM items_tags_junction
          LEFT JOIN tags ON items_tags_junction.tag_id = tags.tag_id
          WHERE items_tags_junction.item_id = i.item_id
        ) AS item_tags,
        (
          SELECT json_agg(to_jsonb(a.*))
          FROM attributes a
          WHERE i.item_id = a.item_id
        ) AS item_attributes
      FROM items i
      LEFT JOIN shops s
        ON i.shop_id = s.shop_id
      LEFT JOIN promo_items pi
        ON i.item_id = pi.item_id
      LEFT JOIN ratings r
        ON i.item_id = r.item_id
      WHERE i.item_id = $1
      GROUP BY i.item_id, 
        i.item_name, 
        i.item_desc, 
        i.item_default_img_id,
        i.item_price, 
        i.shop_id, 
        s.shop_name,
        pi.discount,
        pi.start_date,
        pi.end_date
    `,
      [item_id]
    );
    const itemInfo = itemQuery.rows[0];

    return res.status(200).json(itemInfo);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get info for items on a cart list
// @route Get /items/cart
// @access Public
export async function getCartItemsInfo(req: reqTypes, res: express.Response) {
  try {
    const { id_list } = req.query;
    const query = await pool.query(`
      SELECT 
        items.item_id, 
        items.item_name, 
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url,
        AVG(r.rating_score) AS average_score
      FROM items
      LEFT JOIN shops 
        ON items.shop_id = shops.shop_id
      LEFT JOIN promo_items
        ON items.item_id = promo_items.item_id
      LEFT JOIN item_imgs
        ON items.item_default_img_id = item_imgs.img_id
      LEFT JOIN ratings r
        ON items.item_id = r.item_id
      WHERE items.item_id IN (${id_list})
      GROUP BY 
      items.item_id, 
        items.item_name, 
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url
    `);
    return res.status(200).json(query.rows);
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Add item
// @route POST /items
// @access Private
export async function postItem(req: reqTypes, res: express.Response) {
  try {
    const {
      item_name,
      item_price,
      shop_id,
      item_desc,
      item_tags,
      item_attributes,
    } = req.body;

    if (!item_name || !item_price || !item_desc) {
      return res.status(401).json({ message: "All fields are required" });
    }
    if (item_tags.length < 1) {
      return res.status(401).json({ message: "The item needs at least 1 tag" });
    }

    const checkName = await pool.query(
      `SELECT * 
      FROM items 
      WHERE item_name = $1`,
      [item_name]
    );
    if (checkName.rows[0]) {
      return res
        .status(401)
        .json({ message: "You are already selling this item" });
    }

    const newItem = await pool.query(
      `INSERT INTO items (
        item_name, 
        item_desc, 
        item_price, 
        shop_id) 
        VALUES (
          $1, 
          $2, 
          $3, 
          $4) 
      RETURNING *`,
      [item_name, item_desc, item_price, shop_id]
    );
    const newItemId = newItem.rows[0].item_id;

    await handleTags(item_tags, newItemId);
    await handleAttributes(item_attributes, newItemId);

    return res.status(200).json({ newItemId });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Update shop item
// @route PATCH /items
// @access Private
export async function updateItem(req: reqTypes, res: express.Response) {
  try {
    const {
      item_name,
      item_price,
      item_id,
      shop_id,
      item_desc,
      item_tags,
      item_attributes,
    } = req.body;

    if (!item_name || !item_price || !item_desc) {
      return res.status(401).json({ message: "All fields are required" });
    }
    if (item_tags.length < 1) {
      return res.status(401).json({ message: "The item needs at least 1 tag" });
    }

    await handleTags(item_tags, item_id);
    await handleAttributes(item_attributes, item_id);

    await pool.query(
      `UPDATE items 
      SET 
        item_name = $1, 
        item_desc = $2, 
        item_price = $3 
      WHERE item_id = $4 
      AND shop_id = $5`,
      [item_name, item_desc, item_price, item_id, shop_id]
    );

    return res
      .status(200)
      .json({ message: `Successfully edited item with ID ${item_id}` });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Remove shop item
// @route DELETE /items
// @access Private
export async function deleteItem(req: reqTypes, res: express.Response) {
  try {
    const { item_id, shop_id, relevantTable } = req.body;

    // Delete promo associated
    await pool.query(
      `DELETE FROM promo_items
      WHERE item_id = $1`,
      [item_id]
    );

    // Delete associated images (delete from s3, clear default, clear db)
    const imgQuery = await pool.query(
      `SELECT img_url
      FROM item_imgs
      WHERE item_id = $1`,
      [item_id]
    );
    const item_imgs: ItemImgType[] = imgQuery.rows;
    await Promise.all(
      item_imgs.map(
        async ({ img_url }) => await deleteImgS3(img_url, relevantTable)
      )
    );
    await pool.query(
      `UPDATE items
      SET item_default_img_id = NULL
      WHERE item_id = $1`,
      [item_id]
    );
    await pool.query(
      `DELETE FROM item_imgs
      WHERE item_id = $1`,
      [item_id]
    );

    await pool.query(
      `DELETE FROM items_tags_junction
      WHERE item_id = $1`,
      [item_id]
    );

    await pool.query(
      `DELETE FROM attributes
      WHERE item_id = $1`,
      [item_id]
    );

    // Remove foreign key from ratings
    /* await pool.query(
      `DELETE FROM ratings
      WHERE item_id = $1`,
      [item_id]
    ); */

    // Delete item
    await pool.query(
      `DELETE FROM items 
      WHERE 
        item_id = $1 AND
        shop_id = $2`,
      [item_id, shop_id]
    );

    return res.status(200).json({ message: `Successfully deleted item` });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get all items
// @route GET /items
// @access Public
export async function getMultiItems(req: reqTypes, res: express.Response) {
  try {
    const { offset, limit, shop_id } = req.query;

    const countQuery = await pool.query(`
    SELECT COUNT(*) AS total_count 
    FROM items
    ${shop_id !== undefined ? `WHERE shop_id = ${shop_id}` : ""}
  `);
    const totalCount = countQuery.rows[0].total_count;

    const query = await pool.query(
      `
      SELECT 
        items.item_id, 
        items.item_name, 
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url,
        AVG(r.rating_score) AS average_score
      FROM items
      LEFT JOIN shops 
        ON items.shop_id = shops.shop_id
      LEFT JOIN promo_items
        ON items.item_id = promo_items.item_id
      LEFT JOIN item_imgs
        ON items.item_default_img_id = item_imgs.img_id
      LEFT JOIN ratings r
        ON items.item_id = r.item_id
      ${shop_id !== undefined ? `WHERE items.shop_id = ${shop_id}` : ""}
      GROUP BY 
        items.item_id, 
        items.item_name, 
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url
      OFFSET $1
      LIMIT $2
    `,
      [offset, limit]
    );
    const items = query.rows;

    return res.status(200).json({ items, totalCount });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}

// @desc Get items with name and tags matched with the query
// @route GET /items/search/:query
// @access Public
export async function getSearchedItems(req: reqTypes, res: express.Response) {
  try {
    const { offset = 0, limit = 50 } = req.query;
    const { searchParams }: { searchParams: string } = req.params;
    const filters = searchParams.split(" ");

    // Generate placeholders for the search terms in the WHERE clause
    const placeholders = filters.map((_, index) => `$${index + 1}`);

    // Prepare the array of values to be passed as parameters
    const queryValues = filters.map((term) => `%${term}%`);

    // Construct the WHERE clause using the placeholders
    const whereClause = placeholders
      .map(
        (placeholder) =>
          `(items.item_name ILIKE ${placeholder} OR tags.tag_name ILIKE ${placeholder})`
      )
      .join(" OR ");

    // Construct the subquery for pre-aggregating tag matches
    const subquery = `
      SELECT
        itj.item_id,
        COUNT(*) AS match_count
      FROM items_tags_junction itj
      JOIN tags ON itj.tag_id = tags.tag_id
      JOIN items ON items.item_id = itj.item_id
      WHERE ${whereClause}
      GROUP BY itj.item_id
      `;

    // queries
    const totalCountQuery = await pool.query(
      `
      SELECT COUNT(*) AS total_count
      FROM (${subquery}) AS tag_matches
    `,
      [...queryValues]
    );
    const { total_count } = totalCountQuery.rows[0];

    const query = await pool.query(
      `
      SELECT DISTINCT
        items.item_id, 
        items.item_name, 
        items.item_price, 
        items.shop_id, 
        shops.shop_name,
        promo_items.discount,
        promo_items.start_date,
        promo_items.end_date,
        item_imgs.thumbnail_url,
        tag_matches.match_count
      FROM (${subquery}) AS tag_matches
      JOIN items ON tag_matches.item_id = items.item_id
      LEFT JOIN shops 
        ON items.shop_id = shops.shop_id
      LEFT JOIN promo_items
        ON items.item_id = promo_items.item_id
      LEFT JOIN item_imgs
        ON items.item_default_img_id = item_imgs.img_id
      ORDER BY tag_matches.match_count DESC
      OFFSET $${filters.length + 1}
      LIMIT $${filters.length + 2}
    `,
      [...queryValues, offset, limit]
    );
    const items = query.rows;

    return res.status(200).json({ items, totalCount: total_count });
  } catch (error) {
    console.error(error.message);
    return res.sendStatus(400);
  }
}
