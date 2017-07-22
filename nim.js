const fs = require("fs");

const default_functions = {
	"print": {
		args: ["string"],
		ret: ["string"],
		run: (a, o) => [a[0], a[0]]
	},
	"epoch": {
		args: [],
		ret: ["int"],
		run: (a, o) => ["", new Date().getTime()]
	}
};

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
	this.process = (text) => this.parse(this.tokenizer.reset().tokenize(text));
	
	// Parses tokenized Nim, level 3
	this.parse = (tokenizer) => {
		while (tokenizer.get()) {
			
		}
	};
	
	this.parseStatement = (tokenizer) => {
		
	};
	
	// Functions
	this.functions = default_functions;
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text) => {
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = text.match(/<!--{\s+([\W\w]+?)\s+}-->/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		// Plain HTML surrounding Nim blocks, to be interleaved with Nim output
		this.plain = text.match(/(^|}-->)([\W\w]*?)(<!--{|$)/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		for (var i = 0; i < blocks.length; i ++) {
			this.tokenizeBlock(blocks[i]);
		}
		
		console.log("%j", this.tokens);
		
		return this;
	};
	
	this.tokenizeBlock = (block) => {
		var l;
		
		this.tokens.push([]);
		
		// Find the first token in the block, remove it, repeat
		// Notice all the token type regexes start with ^
		// This is to preserve order and prevent inefficient char-by-char scanning
		while (l = block.length) {
			for (var j = 0; j < this.types.length; j ++) {
				block = block.replace(this.types[j][0], (a, token) => {
					this.tokens[this.tokens.length - 1].push([token, this.types[j][1]]);
					return "";
				});
			}
			
			if (block.length == l) {
				throw new Error("Unidentifiable token @ `" + block.slice(0, 20) + "`...");
			}
		}
		
		// TODO: Optimize (so bad)
		// Turns [..., [*, "subs"], ..., [*, "sube"], ...] into [..., [...], ...]
		for (var i = 0; i < this.tokens.length; i ++) {
			block = this.tokens[i];
			var s = 0;
			
			while (block.map((e) => e[1]).indexOf("subs") > -1) {
				for (var j = 0; j < block.length; j ++) {
					if (block[j][1] == "subs") {
						s ++;
						
						var t = [];
						
						while (s > 0) {
							block.splice(j, 1);
							
							if (block[j][1] == "subs") {
								s ++;
							} else if (block[j][1] == "sube") {
								s --;
								
								if (s < 1) {
									block.splice(j, 1);
								}
							} else {
								t.push(block[j]);
							}
						}
						
						block = block.slice(0, j).concat([t]).concat(block.slice(j, block.length));
					}
				}
			}
			
			this.tokens[i] = block;
		}
		
		// Split tokens on EOL
		var t = [];
		var n = [];
		
		for (var i = 0; i < this.tokens.length; i ++) {
			t.push([]);
			
			for (var j = 0; j < this.tokens[i].length; j ++) {
				var token = this.tokens[i][j];
				
				if (token[1] == "eol") {
					t[i].push(n);
					n = [];
				} else {
					n.push(token);
				}
			}
		}
		
		if (n.length) {
			throw new Error("Code block does not end in semicolon.");
		}
		
		this.tokens = t;
		
		console.log("%j", this.tokens);
	};
	
	// Reset tokenizer, we don't want to create new objects every request
	this.reset = () => {
		this.tokens = [];
		
		this.raw = "";
		this.plain = "";
		
		return this;
	};
	
	// Tokens array, Array of arrays of arrays of (tuples or arrays of tuples)
	// Each tuple is a token, each array of tuples at this level is a code block {...}
	// Each array of tuples is a statement ...;
	// Each array of statements is a Nim block <!--{...}-->
	// The array of Nim blocks is this.tokens
	this.tokens = [];
	
	this.raw = "";
	this.plain = "";
	
	// Token type array
	// Lower index = higher precedence
	this.types = [
		[/^#(.*)[\r\n]+[\s]*/, "comment"],
		[/^({)\s*/, "subs"],
		[/^(})[\s;]*/, "sube"],
		[/^(\d+)[\s;]*/, "int"],
		[/^"([^\\]+?)"[\s;]*/, "string"],
		[/^$([A-Za-z]+)[\s;]*/, "variable"],
		[/^([A-Za-z]+)\(\)[\s;]*/, "function"],
		[/^(;)\s/, "eol"]
	];
}

module.exports = {
	NimServer: Server,
	NimParser: Parser,
	NimTokenizer: Tokenizer
};
