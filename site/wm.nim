<!--{

model EventHandler {
	def $$ $events {
		$$events = [];
		
		for $i 0 { len $events; } {
			$$events[$events[$i]] = [];
		};
	};
	
	def $$dispatchEvent $event $args {
		$callbacks = $$events[$event];
		
		for $i 0 { len $callbacks; } {
			$callbacks[$i]->apply() $args;
		}
	};
	
	def $$on $event $callback {
		$$events[$event]->push() $callback;
	};
};

$windows = [];

}-->