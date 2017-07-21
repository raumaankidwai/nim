const fs = require("fs");

// Level -1       Level 0                         Level 1        Level 2           Level 3

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
	
	// Parses tokenized Nim, level 3
	this.parse = (tokenizer) => {
		return tokenizer.tokens.join("\n");
	};
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, leximizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text) => {
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = /<!--{\s+([\W\w]+?)\s+}-->/.exec(text).slice(1);
		
		for (var i = 0; i < blocks.length; i ++) {
			var block = blocks[i], l;
			
			// Find the first token in the block, remove it, repeat
			// Notice all the token type regexes start with ^
			// This is to preserve order and prevent inefficient char-by-char scanning
			while (l = block.length) {
				for (var j = 0; j < this.types.length; j ++) {
					block = block.replace(this.types[j][0], (a, token) => {
						this.tokens.push([token, this.types[j][1]]);
						return "";
					});
				}
				
				if (block.length == l) {
					throw new Error("Unidentifiable token @ `" + block.slice(0, 20) + "`...");
				}
			}
		}
		
		return this;
	};
	
	// Get token pointed to by current pointer
	this.getCurrentToken = () => this.tokens[pointer];
	
	// Get token from token array at absolute position
	this.getTokenAbsolute = (pointer) => this.tokens[pointer];
	
	// Get token from token array at relative position
	// input of -1 will give token before current token
	this.getTokenRelative = (pointer) => this.tokens[this.pointer + pointer];
	
	this.tokens = [];
	this.pointer = 0;
	
	this.raw = "";
	
	// Token type array
	// Lower index = higher precedence
	this.types = [
		[/^\d+[\s;]/, "int"],
		[/^"([^\\]+?)"[\s;]/, "string"],
		[/^$([A-Za-z]+)[\s;]/, "variable"],
		[/^([A-Za-z]+)\(\)[\s;]/, "function"]
	];
}

module.exports = {
	NimServer: Server,
	NimParser: Parser,
	NimTokenizer: Tokenizer
};
