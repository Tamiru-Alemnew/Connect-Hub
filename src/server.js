const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const config = require("./config");
const { getSocketIOOptions } = require("./config/socket.config");
const RoomManager = require("./rooms/RoomManager");
const SignalingServer = require("./signaling/SignalingServer");
const roomRoutes = require("./routes/roomRoutes");
const errorHandler = require("./middleware/errorHandler");
const createRateLimiter = require("./middleware/rateLimiter");
const logger = require("./utils/logger");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.static(path.join(__dirname, "..", "public")));

app.use(createRateLimiter());

app.use("/", roomRoutes);

app.use(errorHandler);

const server = http.createServer(app);

const io = new Server(server, getSocketIOOptions());

const roomManager = new RoomManager();
const signalingServer = new SignalingServer(io, roomManager);
signalingServer.initialize();

server.listen(config.PORT, () => {
  logger.info(`Server listening on port ${config.PORT}`);
});

