import cors from "cors";
import "dotenv/config";

const whitelist = process.env.CLIENT_URL;

export const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (origin.startsWith(whitelist)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
