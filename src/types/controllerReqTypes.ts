import express from "express";

type userAddressObjType = {
  address_id: number;
  address_name: string;
  address_number: string;
  address_region: string;
  address_postal: string;
  address_street: string;
  address_label: string;
};

export type ItemImgType = {
  img_id: number;
  img_url: string;
};

export type TagType = {
  tag_id: number;
  tag_name: string;
};

export type RelevantTableType = "items" | "users" | "shops";

export type AttributeType = {
  attribute_name: string;
  attribute_value: string;
};

export type RatingType = {
  rating_id: number;
  item_id: number;
  rating_score: number;
  rating_summary: string;
  rating_comment: string;
};

export type bodyTypes = ItemImgType & {
  username: string;
  password: string;
  user_id: number;
  newPassword: string;

  address: {}[];
  selectedAddress: {};
  toDefault: boolean;
  user_address: userAddressObjType;
  address_id: number;

  item_name: string;
  item_desc: string;
  item_price: number;
  item_tags: string[];
  item_attributes: AttributeType[] | null;
  item_id: number;
  shop_id: number;

  shop_name: string;
  shop_email: string;
  discount: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  promo_group_id: number;

  cartArray: {}[];

  orderItems: {}[];
  order_id: number;

  newId: string;

  rounds: number;
  relevantId: number;
  relevantTable: RelevantTableType;
  newImgUrlArr: string[];
  img: ItemImgType;
  item_imgs: ItemImgType[];

  newRating: RatingType;
  id_list: [];
};

type queryTypes = {
  order_id: number;
  shop_id: number;
  user_id: number;
  id_list: [];
  item_id: number;
  rating_score: number;

  offset: number;
  limit: number;
};

export type reqTypes = express.Request<any, any, bodyTypes, queryTypes>;
