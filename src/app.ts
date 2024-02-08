import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { logger } from "./middleware/logger";
import { errorLogger } from "./middleware/errorLogger";
import { corsOptions } from "./config/corsOptions";

const app = express();
const PORT = process.env.PORT || 3500;

app.use(logger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use("/", express.static(path.join(__dirname, "public")));

//routes
app.use("/", require("./routes/root"));
app.use("/auth", require("./routes/auth"));
app.use("/users", require("./routes/users"));
app.use("/address", require("./routes/address"));
app.use("/imgs", require("./routes/imgs"));
app.use("/items", require("./routes/items"));
app.use("/promo", require("./routes/promo"));
app.use("/ratings", require("./routes/ratings"));
app.use("/shops", require("./routes/shops"));
app.use("/orders", require("./routes/orders"));

//404
app.all("*", (req: express.Request, res: express.Response) => {
  res.status(404);
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "views", "404.html"));
  } else if (req.accepts("json")) {
    res.json({ message: "404 Not Found" });
  } else {
    res.type("txt").send("404 Not found");
  }
});

app.use(errorLogger);

app.listen(PORT, () => console.log(`server running on port ${PORT}`));
