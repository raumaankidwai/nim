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
		var output = "";
		var token;
		
		while (token = tokenizer.get()) {
			var value = token[0];
			var type = token[1];
			
			switch (type) {
				case "function":
					var func = this.functions[value];
					
					if (func) {
						var args = [];
						
						for (var i = 0; i < func.args; i ++) {
							tokenizer.proceed();
							args.push(tokenizer.get());
						}
						
						output += func.run(args);
					} else {
						throw new Error("Undefined function: " + value);
					}
				break; default:
					throw new Error("Unimplemented token type: " + type);
			}
			
			tokenizer.proceed();
		}
	};
	
	// Functions
	this.functions = {
		"print": {
			args: 1,
			run: (a) => (a[0] + "\n")
		}
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
	this.get = () => this.tokens[pointer];
	
	// Get token from token array at absolute position
	this.abs = (pointer) => this.tokens[pointer];
	
	// Get token from token array at relative position
	// input of -2 will give token before Tokenizer.last()
	this.rel = (pointer) => this.tokens[this.pointer + pointer];
	
	// Get next token, equivalent to Tokenizer.getTokenRelative(1)
	this.next = () => this.tokens[this.pointer + 1];
	
	// Get last token, equivalent to Tokenizer.getTokenRelative(-1)
	this.last = () => this.tokens[this.pointer - 1];
	
	// Increment pointer
	this.proceed = () => ++this.pointer;
	
	this.tokens = [];
	this.pointer = 0;
	
	this.raw = "";
	
	// Token type array
	// Lower index = higher precedence
	this.types = [
		[/^(\d+)[\s;]/, "int"],
		[/^"([^\\]+?)"[\s;]/, "string"],
		[/^$([A-Za-z]+)[\s;]/, "variable"],
		[/^([A-Za-z]+)\(\)[\s;]/, "function"],
		[/^;\s/, "eol"]
	];
}

module.exports = {
	NimServer: Server,
	NimParser: Parser,
	NimTokenizer: Tokenizer
};
