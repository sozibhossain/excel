import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { createServer } from "http";
import { Server } from "socket.io";
import env from "./config/env.js";
import router from "./mainroute/index.js";
import globalErrorHandler from "./middleware/globalErrorHandler.js";
import notFound from "./middleware/notFound.js";
import rateLimitMiddleware from "./middleware/rateLimit.middleware.js";
import localeMiddleware from "./middleware/locale.middleware.js";
import swaggerSpec from "./swagger.js";
import { registerSocketServer } from "./sockets/emitter.js";

const app = express();
app.set("trust proxy", true);

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.SOCKET_ALLOWED_ORIGINS?.split(",") ?? [env.CLIENT_URL ?? "*"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});
registerSocketServer(io);

app.use(helmet());
app.use(
  cors({
    credentials: true,
    origin: env.CLIENT_URL ?? "*",
  })
);
app.use(compression());
app.use(morgan("tiny"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(rateLimitMiddleware);
app.use(localeMiddleware);

app.use("/public", express.static("public"));
app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", router);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "logistics-backend" });
});

app.use(globalErrorHandler);
app.use(notFound);

io.on("connection", (socket) => {
  console.log("Socket connected", socket.id);
  socket.on("join:parcel", (parcelId) => parcelId && socket.join(`parcel:${parcelId}`));
  socket.on("join:user", (userId) => userId && socket.join(`user:${userId}`));
  socket.on("join:customer", (customerId) =>
    customerId && socket.join(`customer:${customerId}`)
  );
  socket.on("join:agent", (agentId) => agentId && socket.join(`agent:${agentId}`));
  socket.on("disconnect", () => console.log("Socket disconnected", socket.id));
});

const start = async () => {
  try {
    await mongoose.connect(env.MONGO_DB_URL);
    console.log("MongoDB connected");
    server.listen(env.PORT, () => {
      console.log(`Server listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Server start error", error);
    process.exit(1);
  }
};

start();
