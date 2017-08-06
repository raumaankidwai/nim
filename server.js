const http = require("http");
const Nim = require("./nim.js");

const server = new Nim.Server();

server.init({
	absolute: "/home/pi/nim/site/",
	index: "index.nim"
});

http.createServer(server.process).listen(8080);

console.log("Ready!");
