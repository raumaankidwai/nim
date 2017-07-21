function Parser () {
	this = function (req, res) {
		console.log(req.headers);
	};
	
	this.index = "index.nim";
}

module.exports = this;
