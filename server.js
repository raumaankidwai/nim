const http = require("http");
const Nim = require("./nim.js");

const server = new Nim.Server();

http.createServer(server).listen(80);
