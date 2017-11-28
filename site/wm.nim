<!--{

model EventHandler {
	cons "you should not be using the return value of this function" $events {
		$$events = [];
		
		for $i 0 { len $events; } {
			$$events[$events[$i]] = [];
		};
	};
	
	method "dispatchEvent" "you should not be using the return value of this function" $event $args {
		$callbacks = $$events[$event];
		
		for $i 0 { len $callbacks; } {
			$callbacks[$i]->apply() $args;
		}
	};
	
	method "on" "you should not be using the return value of this function" $event $callback {
		$$events[$event]->push() $callback;
	};
};

$windows = [];

}-->
