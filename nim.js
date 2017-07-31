const fs = require("fs");
const path = require("path");

const default_functions = {
	"print": {
		args: 1,
		type: "string",
		run: (a, o) => [a[0], a[0]]
	},
	"epoch": {
		args: 0,
		type: "number",
		run: (a, o) => ["", new Date().getTime()]
	}
};

// Utility functions that need to be taken outside of constructors, maybe recursive stuff
const utils = {
	// Get responses for HTTP error codes
	getErrorResponse: (code) => {
		return code.toString();
	},
	
	// Split partially tokenized block into more blocks on subs/sube
	splitIntoBlocks: (tokens) => {
		var s = 0;
		var t = [];
		var k = false;
		
		for (var i = 0; i < tokens.length; i ++) {
			if (tokens[i][1] == "subs") {
				s ++;
				
				k = true;
			} else if (tokens[i][1] == "sube" && !--s) {
				tokens = tokens.slice(0, i - t.length).concat([[utils.splitIntoBlocks(t.slice(1)), "block"]]).concat(tokens.slice(i + 1));
				
				i -= t.length;
				
				t = [];
				k = false;
			}
			
			if (k) {
				t.push(tokens[i]);
			}
		}
		
		return tokens;
	},
	
	// Split partially tokenized block into statements on EOL (;)
	splitIntoStatements: (tokens) => {
		var t = [];
		
		for (var i = 0; i < tokens.length; i ++) {
			t.push([]);
			
			while (tokens[i][1] != "eol") {
				if (tokens[i][1] == "block") {
					tokens[i][0] = utils.splitIntoStatements(tokens[i][0]);
				}
				
				t[t.length - 1].push(tokens[i]);
				i ++;
				
				if (i >= tokens.length) {
					throw new Error("Code block does not end in semicolon.");
				}
			}
		}
		
		return t;
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
		var code = 200;
		
		var uri = this.processURI(req.url), file;
		
		if (+uri) {
			code = +uri;
		} else {
			try {
				file = fs.readFileSync(uri).toString();
			} catch (e) {
				code = 404;
			}
		}
		
		if (code < 400 && /.nim$/.test(uri)) {
			// TODO: better error throwing in Parser
			try {
				output = this.parser.process(file);
			} catch (e) {
				code = 500;
				
				console.log(e.message);
			}
		}
		
		if (code >= 400) {
			output = utils.getErrorResponse(code);
		}
		
		res.writeHead(code, {
			"Content-Length": output.length,
			"Content-Type": "text/html"
		});
		
		res.write(output);
		
		res.end();
	};
	
	// Initialize server
	// Initializes configs and runs tests to make sure Nim code is valid
	// TODO: have this check all .nim files in server (sub)*dirs
	this.init = (config) => {
		for (var i in config) {
			this[i] = config[i];
		}
	};
	
	// Turn URIs into file locators
	// TODO: Make an htaccess-like format for this
	this.processURI = (uri) => {
		// Index file
		if (uri[uri.length - 1] == "/") {
			uri += this.index;
		}
		
		// Truncates first /
		// GET /a/b/c => GET a/b/c
		uri = uri.slice(1);
		
		// This. Module. Is. Amazing.
		// at least it seems so after 5 hours of not knowing about it
		uri = path.format({
			dir: this.absolute,
			base: uri
		});
		
		var pathObj = path.parse(uri);
		
		// Check if no extension
		if (!pathObj.ext) {
			var files = fs.readdirSync(pathObj.dir).filter((e) => !e.indexOf(pathObj.name));
			
			if (files.length > 1) {
				return 416; // 416 Range Not Satisfiable, bends the definition a little bit to use "range" as "range of files" and not "range of bytes of file"
			} else if (files.length < 1) {
				return 404; // Obv
			} else {
				uri = path.format({
					dir: pathObj.dir,
					base: files[0]
				});
			}
		}
		
		return uri;
	};
	
	// Absolute directory
	this.absolute = "/";
	
	// Index file
	this.index = "index.nim";
	
	// Moving on to level 1...
	this.parser = new Parser();
}

// Parser constructor
function Parser () {
	// Interprets Nim-coded HTML, level 1
	this.process = (text) => {
		this.functions = default_functions;
		this.variables = {};
		
		return this.parse(this.tokenizer.tokenize(text))[0];
	}
	
	// Parses tokenized Nim, level 3
	this.parse = (tokenizer) => {
		var tokens = tokenizer.tokens;
		var plain = tokenizer.plain;
		
		// output[0] is text printed to page
		// output[1] is returned value
		var output = [plain[0], ];
		
		for (var i = 0; i < tokens.length; i ++) {
			for (var j = 0; j < tokens[i].length; j ++) {
				var statement = this.parseStatement(tokens[i][j]);
				
				output[0] += statement[0];
				output[1] = statement[1];
			}
			
			output[0] += plain[i + 1];
		}
		
		return output;
	};
	
	// Parse individual statements
	// VALID STATEMENTS:
	// <function> [arg1] [arg2] [...]
	// <variable> <equals> <data>
	// <data> <operation> <data>
	// <data>
	this.parseStatement = (statement) => {
		var output = "", ret, k;
		
		var f = (e) => e[1] == "variableGet" ? [this.variables[e[0]], "variableGet"] : e[1] == "block" ? [e[0].map(f), e[1]] : e;
		
		statement = statement.map((e) => e[1] == "block" ? (k = e[0].map(this.parseStatement).reduce((a, b) => [a[0] + b[0], b[1], b[2]]), output += k[0], [k[1], k[2]]) : e).map(f);
		
		switch (statement[0][1]) {
			case "function":
				var name = statement[0][0];
				var func = this.functions[name];
				
				if (func) {
					statement = statement.slice(1);
					
					if (statement.length != func.args) {
						throw new Error("Incorrect number of arguments: Expected " + func.args.length + " arguments for function `" + name + "` but got " + statement.length);
					}
					
					var res = func.run(statement.map((e) => e[0]));
					
					output += res[0];
					ret = res[1];
					rettype = func.type;
				} else {
					throw new Error("Undefined function: " + name);
				}
			break; case "variableSet":
				this.variables[statement[0][0]] = statement[1][0];
				
				ret = statement[1][0];
				rettype = statement[1][1];
			break; case "number":
			case "string":
			case "bool":
			case "variableGet":
				switch (statement[1][1]) {
					case "plus":
						ret = statement[0][0] + statement[2][0];
					break; case "minus":
						ret = statement[0][0] - statement[2][0];
					break; case "times":
						ret = statement[0][0] * statement[2][0];
					break; case "div":
						ret = statement[0][0] / statement[2][0];
					break; case "mod":
						ret = statement[0][0] % statement[2][0];
					break; case "intdiv":
						ret = Math.floor(statement[0][0] / statement[2][0]);
					break; case undefined:
						ret = statement[0];
					break; default:
						throw new Error("Expected operation on " + statement[0][1]);
				}
				
				rettype = "" + ret === ret ? "string" : ret == true || ret == false ? "bool" : "number";
			break; default:
				throw new Error("Invalid statement beginning: " + statement[0][0] + " (" + statement[0][1] + ")");
		}
		
		return [output, ret, rettype];
	};
	
	// Functions
	this.functions = default_functions;
	
	
	// Variables
	this.variables = {};
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text) => {
		this.reset();
		
		this.raw = text;
		
		// Array of blocks of pure Nim code
		var blocks = text.match(/<!--{\s*([\W\w]+?)\s*}-->/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		// Plain HTML surrounding Nim blocks, to be interleaved with Nim output
		this.plain = text.match(/(^|}-->)([\W\w]*?)(<!--{|$)/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		for (var i = 0; i < blocks.length; i ++) {
			this.tokens.push(this.tokenizeBlock(blocks[i]));
		}
		
		return this;
	};
	
	this.tokenizeBlock = (block) => {
		var tokens = [];
		
		for (var i = 0; i < block.length;) {
			var value = block[i];
			var type;
			
			// Hello, future me.
			// If you're reading this, this tokenizer has broken and you probably still remember writing this comment.
			// Don't try to understand the increments. Please.
			// They work. Maybe.
			
			// Sincerely, past you.
			
			// https://xkcd.com/1421/
			
			if (value == "#") {
				type = "comment";
				
				// While no newline, keep adding to the comment
				while (!/[\r\n]/.test(block[i])) {
					value += block[i ++];
				}
			} else if (value == "{") {
				type = "subs";
			} else if (value == "}") {
				type = "sube";
			} else if (value == ";") {
				type = "eol";
			} else if (value == "=") {
				type = "equals";
			} else if (value == "+") {
				type = "plus";
			} else if (value == "-") {
				type = "minus";
			} else if (value == "*") {
				type = "times";
			} else if (value == "/") {
				type = "div";
			} else if (value == "%") {
				// %/ is intdiv, % is mod, distinguish
				if (block[i + 1] == "/") {
					type = "intdiv";
					i ++;
				} else {
					type = "mod";
				}
			} else if (value == "$") {
				// If there is no alphanumeric character in front of the $, error
				if (!/[A-Za-z0-9]/.test(block[++i])) {
					throw new Error("Expected variable identifier");
				}
				
				// Keep adding to the identifier until identifier runs out
				while (/[A-Za-z0-9]/.test(block[i])) {
					value += block[i ++];
				}
				
				while (/\s/.test(block[i])) {
					i ++;
				}
				
				if (block[i] == "=") {
					type = "variableSet";
				} else {
					type = "variableGet";
					i --;
				}
				
				value = value.slice(1);
			} else if (/\d/.test(value)) {
				type = "number";
				
				var hex = false;
				
				if (!+value) {
					if (block[++i] != "." && block[i] != "b" && block[i] != "o" && block[i] != "x" && /\D/.test(block[i])) {
						throw new Error("Expected numerical radix, got " + value + block[i]);
					} else {
						if (block[i] == "x") {
							hex = true;
						}
						
						value += block[i];
					}
				}
				
				while ((hex ? /[\dA-Fa-f]/ : /[\d\.]/).test(block[i + 1])) {
					value += block[++i];
				}
				
				value = Number(value);
			} else if (value == "\"" || value == "'") {
				type = "string";
				
				var delim = value, bs = false; // Backslashes indicate BS string endings
				
				while (block[++i] != delim || bs) {
					if (!block[i]) {
						throw new Error("String without ending");
					}
					
					value += block[i];
					
					bs = false;
					
					if (block[i] == "\\") {
						bs = true;
					}
				}
				
				value = value.slice(1);
			} else if (/[A-Za-z0-9]/.test(value)) {
				// Identifier time! (ouch)
				while (/[A-Za-z0-9]/.test(block[i + 1])) {
					value += block[++i];
				}
				
				if (value == "true" || value == "false") {
					type = "bool";
					value = Boolean(value);
				} else if ((block[i + 1] + block[i + 2]) == "()") {
					i += 2;
					type = "function";
				}
			} else {
				throw new Error("Invalid character: " + value);
			}
			
			tokens.push([value, type]);
			
			while (/\s/.test(block[++i]));
		}
		
		tokens = utils.splitIntoStatements(utils.splitIntoBlocks(tokens));
		
		return tokens;
	};
	
	// Reset tokenizer, we don't want to create new objects every request
	this.reset = () => {
		this.tokens = [];
		
		this.raw = "";
		this.plain = "";
		
		return this;
	};
	
	// Tokens array, Array of arrays of arrays of tuples
	// Each tuple is a token
	// Each array of tuples is a statement ...;
	// Each array of statements is a Nim block <!--{...}-->
	// The array of Nim blocks is this.tokens
	this.tokens = [];
	
	this.raw = "";
	this.plain = "";
	
	// Token type arrays
	this.comments = [
		[/^#(.*)([\r\n]|$)+[\s]*/, "comment"]
	];
	this.syntax = [
		[/^({)\s*/, "subs"],
		[/^(})\s*/, "sube"],
		[/^(;)\s*/, "eol"],
		[/^(=)\s*/, "equals", /^=$/]
	];
	this.operations = [
		[/^(\+)\s*/, "plus", /^\+$/],
		[/^(-)\s*/, "minus", /^-$/],
		[/^(\*)\s*/, "times", /^\*$/],
		[/^(%\/)\s*/, "intdiv", /^%\/$/],
		[/^(\/)\s*/, "div", /^\/$/],
		[/^(%)\s*/, "mod", /^%$/]
	];
	this.variables = [
		[/^(\$[A-Za-z]+\s*=)\s*/, "variableSet", /^\$[A-Za-z]+\s*=$/]
	];
	this.datatypes = [
		[/^(\d+)\s*/, "int", /^\d+$/],
		[/^((['"]).+?[^\\]\2)\s*/, "string", /^".+?[^\\]"$/],
		[/^(true|false)\s*/, "bool", /^(true|false)$/],
		[/^(\$[A-Za-z]+)\s*/, "variableGet", /^\$[A-Za-z]+$/]
	];
	this.functions = [
		[/^([A-Za-z]+\(\))\s*/, "function", /^[A-Za-z]+\(\)$/]
	];
	
	this.types = this.comments.concat(this.syntax)
		.concat(this.operations)
		.concat(this.variables)
		.concat(this.datatypes)
		.concat(this.functions);
}

module.exports = {
	Server: Server,
	Parser: Parser,
	Tokenizer: Tokenizer,
	utils: utils
};