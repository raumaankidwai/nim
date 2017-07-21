const fs = require("fs");

// REQUEST -----> Server.process                  Parser.process                   Parser.parse -----> CLIENT-READY
//                      |                              ^ |                               ^
//                      |-----> Server.processURI -----| |-----> Tokenizer.tokenize -----|

function Server () {
	this.process = (req, res) => {
		res.setHeader("Content-Type", "text/html");
		
		res.write(this.parser.process(fs.readFileSync(this.processURI(req.url)).toString()));
		
		res.end();
	};
	
	this.processURI = (uri) => {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return this.index;
		}
		
		return uri;
	};
	
	this.index = "index.nim";
	
	this.parser = new Parser();
}

function Parser () {
	this.process = (text) => {
		return this.parse(this.tokenizer.tokenize(text));
	};
	
	this.parse = (tokenizer) => {
		return tokenizer.raw;
	};
	
	this.tokenizer = new Tokenizer();
}

function Tokenizer () {
	this.tokenize = (text) => {
		this.raw = text;
		
		var blocks = /<!--{\s+([\W\w]+?)\s+}-->/.exec(text).slice(1);
		
		return this;
	};
	
	this.getToken = (pointer) => {
		return this.tokens[pointer];
	};
	
	this.getTokenRelative = (pointer) => {
		return this.tokens[this.pointer + pointer];
	};
	
	this.tokens = [];
	this.pointer = 0;
	
	this.raw = "";
	
	this.types = [
		[/^([A-Za-z]) /, "function"]
	];
}

module.exports = {
	Server: Server,
	Parser: Parser,
	Tokenizer: Tokenizer
};
