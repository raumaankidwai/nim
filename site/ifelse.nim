<!--{
	$sec = { { epoch(); } %/ 1000; };
	$oddeven = { $sec % 2; };
	
	print() "This second is ";
	
	if $oddeven { print() "odd"; };
	else { print() "even"; };
	
	print() { " (" + $sec; };
	print() ")";
}-->