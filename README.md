# nim
Server-side language, maybe, let's see if I give up.

Not related to *that* Nim

WAIT A SECOND I'M ALREADY CLOSER TO THIS WORKING THAN JPL, I'LL JUST DITCH JPL!

# Theoretical Syntax

```
<!DOCTYPE HTML>
<blah blah blah HTML stuff>

<!-- Nim start and end tags work as HTML comments because that's useful -->
<!--{
# comment

# this is Nim
# Nim has functions and strings and stuff
# strongly typed, but not that strong

# print() is a function with 1 argument
# functions have arguments outside of parentheses
# strings are bounded by double-quotes only
# semicolons end all statements
# functions can be named any alphabetic string as long as the string isn't all uppercase (reserved for keywords)
print() "Hello there!";

# define functions with `DEF` and `W` (short for "with") keywords
# each `W` adds an argument
# the first 'parameter' of `W` is an object the same type as the intended argument
# the second is the name of the argument
# oh yeah and variables are like PHP
DEF add W[2 $a] W[3 $b] {

# Addition is + obviously
# return is RET
RET $a + $b;

};

# Yay nested functions
print() {add() 2 3};

# Oh wait I forgot setting variables
$a = 3

# uhh
# oh yeah
# functions with 0 arguments work too
# dunno why I'm not putting indentation but as you can see I'm very bored

DEF incr {

RET {$a = {$a + 1}};

}

incr() $a
print() $a # prints 4

}-->
```

A fibonacci program (without open/close tags), showcasing while loops and bools

```
# First two variables
$a = 1
$b = 1

# Loop infinitely
# 1 can't be used here, so we have `true` and `false`
while {true} {

# Print
print() $a

# Increment/swap/thing that you need to do
$c = $b
$b = $a + $b
$a = $c

# Deletion is available since all vars are global, prob not necessary I dunno
DEL $c

}
```
