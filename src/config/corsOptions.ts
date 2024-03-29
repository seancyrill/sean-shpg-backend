import cors from "cors";
import "dotenv";

const whitelist = process.env.CLIENT_URL;

export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (
      origin.startsWith(whitelist)
      //whitelist.indexOf(origin) !== -1 || !origin
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
