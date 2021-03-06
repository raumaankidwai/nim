const fs = require("fs");
const path = require("path");

const defaultFunctions = {
	"print": {
		args: 1,
		run: (a, o) => [a[0], a[0]]
	},
	"epoch": {
		args: 0,
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
	splitIntoStatements: (tokens, file) => {
		var t = [];
		
		for (var i = 0; i < tokens.length; i ++) {
			t.push([]);
			
			while (tokens[i][1] != "eol") {
				if (tokens[i][1] == "block") {
					tokens[i][0] = utils.splitIntoStatements(tokens[i][0], file);
				}
				
				t[t.length - 1].push(tokens[i ++]);
				
				if (i >= tokens.length) {
					throw new NimError("Code block does not end in semicolon.", file, tokens[tokens.length - 1][2]);
				}
			}
		}
		
		return t;
	}
};

// Nim custom errors
// Stolen from SO
function NimError (msg, file, char) {
	this.message = msg;
	
	this.name = this.constructor.name;
	
	this.file = file.replace(/\/+/g, "/");
	this.fileText = fs.readFileSync(file).toString();
	
	var leadingText = this.fileText.slice(0, char);
	
	this.line = leadingText.match(/\n/g).length + 1;
	this.char = char - leadingText.lastIndexOf("\n");
	
	Error.captureStackTrace(this, this.constructor);
}

NimError.prototype = Object.create(Error.prototype);

NimError.prototype.print = function () {
	console.log(this.file + ":" + this.line + ":" + this.char);
	console.log("\t\t" + this.fileText.split("\n")[this.line - 1]);
	console.log("\t\t" + " ".repeat(this.char) + "^");
	console.log("NimError: " + this.message);
	console.log("    at " + this.file + ":" + this.line + ":" + this.char);
}

// Level -1       Level 0                         Level 1        Level 2           Level 3

// REQUEST -----> Server.process                  Parser.process                   Parser.parse -----> CLIENT-READY
//                      |                              ^ |                               ^
//                      |-----> Server.processURI -----| |-----> Tokenizer.tokenize -----|

// Server constructor
function Server (config) {
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
				code = 404; // Horrible, I know
			}
		}
		
		if (code < 400 && /.nim$/.test(uri)) { // even more horrible
			try {
				output = this.parser.process(file, uri);
			} catch (e) {
				code = 500;
				
				if (e instanceof NimError) {
					e.print();
				} else {
					throw e;
				}
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
	
	// Turn URIs into file locators
	// TODO: Make an htaccess-like format for this
	this.processURI = (uri) => {
		// Index file
		if (uri[uri.length - 1] == "/") {
			uri += this.config.index;
		}
		
		// Truncates first /
		// GET /a/b/c => GET a/b/c
		uri = uri.slice(1);
		
		// This. Module. Is. Amazing.
		// at least it seems so after 5 hours of not knowing about it
		uri = path.format({
			dir: this.config.absolute,
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
	
	this.config = {
		// Absolute directory
		absolute: "/",
		
		// Index file
		index: "index.nim"
	};
	
	for (var i in this.config) {
		this.config[i] = config[i] || this.config[i];
	}
	
	// Moving on to level 1...
	this.parser = new Parser();
}

// Parser constructor
function Parser () {
	// Interprets Nim-coded HTML, level 1
	this.process = (text, file) => {
		this.functions = defaultFunctions;
		this.variables = {};
		
		this.file = file;
		
		return this.parse(this.tokenizer.tokenize(text, file))[0];
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
	// <comment>
	// <function> [arg1] [arg2] [...]
	// <variable> <equals> <data>
	// <data> <operation> <data>
	// <data>
	// <if> <boolean> <block>
	// <elseif> <boolean> <block>
	// <else> <block>
	// <def> <string> <variable...> <block>
	// <for> <variable> <boolean> <block> <block>
	// <while> <boolean> <block>
	this.parseStatement = (s) => {
		var statement = JSON.parse(JSON.stringify(s));
		
		if (!statement.length) {
			return [""];
		}
		
		var output = "", ret, k;
		
		var f = (e) => {
			// If type is variableGet and statement isn't one that requires variable-type expressions not to be evaluated beforehand, evaluate variable
			if (e[1] == "variableGet" && !(["def", "for"].indexOf(statement[0][1]) > -1)) {
				return [this.variables[e[0]], "data"];
			} else if (e[1] == "block") {
				return [e[0].map(f), e[1]];
			} else {
				return e;
			}
		};
		
		statement = statement.map((e, i) => {
			// If type is block and statement isn't one that requires blocks not to be evaluated beforehand, evaluate block
			if (e[1] == "block" &&
				!(["if", "elseif", "else"].indexOf(statement[0][1]) > -1 && i == statement.length - 1) // Commands where only the last token should be left
				&& !(["for", "while"].indexOf(statement[0][1]) > -1)) { // Commands where all blocks shouldn't be evaluated
				var k = e[0].map(this.parseStatement);
				
				if (k.length) {
					k = k.reduce((a, b) => [a[0] + b[0], b[1], b[2]]);
				}
				
				output += k[0];
				
				return [k[1], "data"];
			} else {
				return e;
			}
		}).map(f);
		
		var lastLooked = 0;
		
		switch (statement[0][1]) {
			case "comment":
				
			break; case "function":
				var name = statement[0][0];
				var func = this.functions[name];
				
				if (func) {
					var args = statement.slice(1);
					
					if (args.length != func.args) {
						throw new NimError("Incorrect number of arguments: Expected " + func.args.length + " arguments for function `" + name + "` but got " + args.length, this.file, statement[statement.length - 1][2]);
					}
					
					var res = func.run(args.map((e) => e[0]));
					
					output += res[0];
					ret = res[1];
					
					lastLooked = statement.length - 1;
				} else {
					throw new NimError("Undefined function: " + name, this.file, statement[0][2]);
				}
			break; case "variableSet":
				this.variables[statement[0][0]] = statement[1][0];
				
				ret = statement[1][0];
				
				lastLooked = 1;
			break; case "data":
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
					break; case "equality":
						ret = statement[0][0] == statement[2][0];
					break; case "gt":
						ret = statement[0][0] > statement[2][0];
					break; case "gte":
						ret = statement[0][0] >= statement[2][0];
					break; case "lt":
						ret = statement[0][0] < statement[2][0];
					break; case "lte":
						ret = statement[0][0] <= statement[2][0];
					break; case undefined:
						ret = statement[0];
					break; default:
						throw new NimError("Expected operation on " + statement[0][1], this.file, statement[0][2]);
				}
				
				lastLooked = 2;
			break; case "if":
				this.conditions = [statement[1][0]];
				
				if (statement[1][0]) {
					var r = statement[2][0].map(this.parseStatement).reduce((a, b) => [a[0] + b[0], b[1], b[2]]);
					
					output = r[0];
					ret = r[1];
				}
				
				lastLooked = 2;
			break; case "elseif":
				if (!this.conditions.length) {
					throw new NimError("elseif after no if or elseif", this.file, statement[0][2]);
				}
				
				if (!this.conditions.reduce((a, b) => a || b) && statement[1][0]) {
					var r = statement[2][0].map(this.parseStatement).reduce((a, b) => [a[0] + b[0], b[1], b[2]]);
					
					output = r[0];
					ret = r[1];
				}
				
				this.conditions.push(statement[1][0]);
				
				lastLooked = 2;
			break; case "else":
				if (!this.conditions.length) {
					throw new NimError("else after no if or elseif", this.file, statement[0][2]);
				}
				
				if (!this.conditions.reduce((a, b) => a || b)) {
					var r = statement[1][0].map(this.parseStatement).reduce((a, b) => [a[0] + b[0], b[1], b[2]]);
					
					output = r[0];
					ret = r[1];
				}
				
				lastLooked = 1;
			break; case "def":
				var args = statement.slice(2, statement.length - 1);
				var code = statement[statement.length - 1][0];
								
				this.functions[statement[1][0]] = {
					args: args.length,
					run: (a, o) => {
						var parser2 = Object.assign(new Parser(), this);
						
						for (var i = 0; i < args.length; i ++) {
							parser2.variables[args[i][0]] = a[i];
						}
						
						var k = code.map(parser2.parseStatement).reduce((a, b) => [a[0] + b[0], b[1], b[2]]);
						
						return [k[0], k[1]];
					}
				};
				
				lastLooked = statement.length - 1;
			break; case "for":
				var init = statement[1][0];
				var cond = statement[2][0];
				var action = statement[3][0];
				var code = statement[4][0];
				
				var parser2 = Object.assign(new Parser(), this);
				output += parser2.parseStatement(init)[0];
				
				while ((k = parser2.parseStatement(cond)), (output += k[0]), k[1]) {
					output += parser2.parseStatement(action)[0];
					output += parser2.parseStatement(code)[0];
				}
			break; default:
				console.log(statement);
				throw new NimError("Invalid statement beginning: " + statement[0][0] + " (" + statement[0][1] + ")", this.file, statement[0][2]);
		}
		
		if ((statement.length - 1) > lastLooked) {
			throw new NimError("Unexpected token: `" + statement[lastLooked + 1] + "`", this.file, statement[lastLooked + 1][2]);
		}
		
		return [output, ret, statement[statement.length - 1][2]];
	};
	
	// Functions
	this.functions = defaultFunctions;
	
	// Variables
	this.variables = {};
	
	// Condition of previous if/elseif/else, if needed
	this.conditions = [];
	
	// Moving on to level 2...
	this.tokenizer = new Tokenizer();
}

// Tokenizer constructor
function Tokenizer () {
	// Tokenizes (lexes, lexemizes, lexically analyzes, whatever) Nim-coded HTML, level 2
	this.tokenize = (text, file) => {
		this.reset();
		
		this.raw = text;
		this.file = file;
		
		// Array of blocks of pure Nim code
		var re = /<!--{\s*([\W\w]+?)\s*}-->/g;
		var blocks = [], indices = [], match;
		
		while (match = re.exec(text)) {
			blocks.push(match[1]);
			
			for (var i = match.index + 5; /\s/.test(text[i]); i ++);
			
			indices.push(i);
		}
		
		// Plain HTML surrounding Nim blocks, to be interleaved with Nim output
		this.plain = text.match(/(^|}-->)([\W\w]*?)(<!--{|$)/g).map((e) => e.replace(/(<!--{\s*|\s*}-->)/g, ""));
		
		for (var i = 0; i < blocks.length; i ++) {
			this.tokens.push(this.tokenizeBlock(blocks[i], indices[i]));
		}
		
		return this;
	};
	
	this.tokenizeBlock = (block, index) => {
		var tokens = [];
		
		for (var i = 0; i < block.length;) {
			var value = block[i];
			var type;
			
			// Hello, future me.
			// If you're reading this, this tokenizer has probably broken and you probably still remember writing this comment.
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
				if (block[i + 1] == "=") {
					type = "equality";
					i ++;
				} else {
					type = "equals";
				}
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
			} else if (value == ">" || value == "<") {
				type = (value == ">" ? "g" : "l") + "t";
				
				if (block[i + 1] == "=") {
					type += "e";
					i ++;
				}
			} else if (value == "$") {
				// If there is no alphanumeric character in front of the $, error
				if (!/[A-Za-z0-9]/.test(block[++i])) {
					throw new NimError("Expected variable identifier", this.file, index + i);
				}
				
				// Keep adding to the identifier until identifier runs out
				while (/[A-Za-z0-9]/.test(block[i])) {
					value += block[i ++];
				}
				
				while (/\s/.test(block[i])) {
					i ++;
				}
				
				if (block[i] == "=" && block[i + 1] != "=") {
					type = "variableSet";
				} else {
					type = "variableGet";
					i --;
				}
				
				value = value.slice(1);
			} else if (/\d/.test(value)) {
				type = "data";
				
				var hex = false;
				
				if (!+value) {
					if (block[++i] != "." && block[i] != "b" && block[i] != "o" && block[i] != "x" && /\D/.test(block[i])) {
						throw new NimError("Expected numerical radix, got " + value + block[i], this.file, index + i);
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
				type = "data";
				
				var delim = value, bs = false; // Backslashes indicate BS string endings
				
				while (block[++i] != delim || bs) {
					if (!block[i]) {
						throw new NimError("String without ending", this.file, index + i);
					}
					
					bs = false;
					
					if (block[i] == "\\") {
						bs = true;
					} else {
						value += block[i];
					}
				}
				
				value = value.slice(1);
			} else if (/[A-Za-z0-9]/.test(value)) {
				// Identifier time! (ouch)
				while (/[A-Za-z0-9]/.test(block[i + 1])) {
					value += block[++i];
				}
				
				if (value == "true" || value == "false") {
					type = "data";
					value = value == "true";
				} else if ((block[i + 1] + block[i + 2]) == "()") {
					i += 2;
					type = "function";
				} else if (this.keywords.indexOf(value) > -1) {
					type = value;
				} else {
					throw new NimError("Invalid identifier:" + value, this.file, index + i);
				}
			} else {
				throw new NimError("Invalid character: " + value, this.file, index + i);
			}
			
			tokens.push([value, type, index + i]);
			
			while (/\s/.test(block[++i]));
		}
		
		tokens = utils.splitIntoStatements(utils.splitIntoBlocks(tokens), this.file);
		
		return tokens;
	};
	
	// Reset tokenizer, we don't want to create new objects every request
	this.reset = () => {
		this.tokens = [];
		
		this.raw = "";
		this.plain = [];
		
		this.file = "";
		
		return this;
	};
	
	// List of straight identifier keywords, ex. if, elseif, else, def, ...
	this.keywords = ["if", "elseif", "else", "def", "for", "while"];
	
	// Tokens array, Array of arrays of arrays of tuples
	// Each tuple is a token
	// Each array of tuples is a statement ...;
	// Each array of statements is a Nim block <!--{...}-->
	// The array of Nim blocks is this.tokens
	this.tokens = [];
	
	this.raw = "";
	this.plain = [];
	
	this.file = "";
}

module.exports = {
	Server: Server,
	Parser: Parser,
	Tokenizer: Tokenizer,
	utils: utils
};
