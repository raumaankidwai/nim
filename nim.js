function Server () {
	this.index = "index.nim";
	
	this.process = function (req, res) {
		console.log(req.headers);
	};
}

module.exports = {
	Server: Server
};
