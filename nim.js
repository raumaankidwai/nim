const fs = require("fs");

// Level -1       Level 0                         Level 1        Level 2  Level 3  Level 4

// REQUEST -----> Server.process                  Parser.process                   Parser.parse -----> CLIENT-READY
//                      |                              ^ |                               ^
//                      |-----> Server.processURI -----| |-----> Tokenizer.tokenize -----|

// Server constructor
function Server () {
	// Process requests, level 0
	this.process = (req, res) => {
		res.setHeader("Content-Type", "text/html");
		
		res.write(this.parser.process(fs.readFileSync(this.processURI(req.url)).toString()));
		
		res.end();
	};
	
	// Turn URIs into file locators
	// TODO: Make an htaccess-like format for this
	this.processURI = (uri) => {
		uri = uri.slice(1)
		
		if (!uri.length) {
			return this.index;
		}
		
		return uri;
	};
	
	// Index file
	this.index = "index.nim";
	
	// Moving on to level 1...
	this.parser = new Parser();
}

// Parser constructor
function Parser () {
	// Interprets Nim-coded HTML, level 1
	this.process = (text) => this.parse(this.tokenizer.tokenize(text));
	
	// Parses tokenized Nim, level 4
	this.parse = (tokenizer) => tokenizer.raw;
	
	// Moving on to level 3...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, leximizes, lexically analyzes, whatever) Nim-coded HTML:
	// Scans it, level 2
	// Evaluates it, level 3
	this.tokenize = (text) => {
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = /<!--{\s+([\W\w]+?)\s+}-->/.exec(text).slice(1);
		
		for (var i = 0; i < blocks.length; i ++) {
			var block = blocks[i];
			
			while (block.length) {
				var oblock = block;
				
				for (var j = 0; j < this.types.length; j ++) {
					block.replace(types[j][0], (a, token) => {
						this.tokens.push([token, types[j][1]]);
						return "";
					});
				}
				
				if (block == oblock) {
					throw new Error("Unidentifiable token @ `" + block.slice(0, 20) + "`...");
				}
			}
		}
		
		return this;
	};
	
	this.getCurrentToken = () => this.tokens[pointer];
	
	// Get token from token array at absolute position
	this.getTokenAbsolute = (pointer) => this.tokens[pointer];
	
	// Get token from token array at relative position
	// input of -1 will give token before current token
	this.getTokenRelative = (pointer) => this.tokens[this.pointer + pointer];
	
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
