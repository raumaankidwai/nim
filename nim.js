function Server () {
	this.process = function (req, res) {
		console.log(req.headers);
	};
	
	this.index = "index.nim";
}

module.exports = {
	Server: Server
};
