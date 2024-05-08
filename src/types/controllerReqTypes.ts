import express from "express";

export type bodyTypes = {};

type queryTypes = {};

export type reqTypes = express.Request<any, any, bodyTypes, queryTypes>;
