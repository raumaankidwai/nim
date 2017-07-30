# Statements

In Nim, statements are blocks of Nim code delimited by semicolons. Each statement is interpreted in order from the start of the page; as such, a variable declared in the next statement cannot be referenced in the current statement for fear of error.

For example, `print() "Hello!"` is a valid statement iff followed by a semicolon, whereas even if `i-am-NOT-valid-Nim-code` is followed by a semicolon, it is not a valid statement.

Statements are only valid if they fit one of a multitude of possible formats. As of v0.5, these formats are:

* Running a function (`print() "Hello, world!";`)
* Setting a variable (`$a = 3;`)
* Performing an operation on two data types and returning the result (`3 + 4;`)
* Returning a data type (`3;`)

### Next: [Code blocks](CODE-BLOCKS.md)