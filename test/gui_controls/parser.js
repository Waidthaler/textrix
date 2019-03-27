//==============================================================================
// The mcu -- master control unit -- object is the global face of the
// application.
//==============================================================================

var mcu = {
	docs: [      // Default docs at startup -- if content is string, loads from prepack
		{ name: "You", weight: 1.0, content: [ ], active: true  },
		{ name: "",    weight: 0.0, content: [ ], active: false },
		{ name: "",    weight: 0.0, content: [ ], active: false },
		{ name: "",    weight: 0.0, content: [ ], active: false },
		{ name: "",    weight: 0.0, content: [ ], active: false },
	],
	userDoc:        0,            // offset of docs wherein to store user input
	runMode:        "monologue",  // may be either "monologue" or "dialogue"
	inputFilter:    ['"'],        // array of tokens/regexps to purge from input
	outputFilter:   null,         // filter to use on output
	delay:          3000,         // delay for monologue in milliseconds
	responseLength: 3,            // number of sentences per response
	diagnostics:    false,        // if true, diagnostic output is captured
};



//==============================================================================
// Tokenizes a block of text and stores it in mcu.docs. The arguments are as
// follows:
//
//		content ... The string to be parsed. 
//		doc ....... This is either an integer index into mcu.docs, or it is null,
//                  in which case it is created as a new member of mcu.docs.
//      name ...... If non-null, this is a string to be used as the title of the
//                  document. (Typically null when appending to an existing
//                  document.
//      append .... Boolean. If true, appends; if false, overwrites.
//      filter .... Boolean. Specifies whether to apply the current input filter
//                  settings.
//==============================================================================

function parseDocument(content, doc, name, append, filter) {

	var startTime = new Date();
	var tokens = tokenize(content);
	var endTime = new Date();

	var runTime = endTime - startTime;
	var msg = "@parseDocument([content], " + doc + ", " + name + ", " + append + ", " + filter + ");\n" +
		"Input size:  " + content.length + " bytes\n" +
		"Token count: " + tokens.length + "\n" +
		"Run time:    " + Math.round(runTime / 1000) + " seconds (" + runTime + " msecs)\n" +
		"Byte rate:   " + (runTime / content.length) + " msec per byte\n" +
		"Token rate:  " + (runTime / tokens.length) + " msec per token\n";

	if(doc == null) {
		mcu.docs.push( { name: "", weight: 0.0, content: [ ], active: false } );
		doc = mcu.docs.length - 1;
		msg += "Created new document " + doc + ".\n";
	}
	if(name != null) {
		mcu.docs[doc].name = name;
	}
	if(filter) {
		tokens = purgeTokens(tokens, mcu.inputFilter);
	}
	if(append) {
		while(tokens.length) {
			mcu.docs[doc].content.push(tokens.pop());
		}
		msg += "Appended input to existing document " + doc + " (" + mcu.docs[doc].name + ").\n";
	} else {
		mcu.docs[doc].content = tokens;
		msg += "Replaced content of document " + doc + " (" + mcu.docs[doc].name + ").\n";
	}
	if(mcu.diagnostics) {
		debug(msg);
	}
}


//==============================================================================
// Given a block of natural language text, tokenize() breaks it into tokens and
// returns it as an array.
//==============================================================================

function tokenize(txt) {
	
	// Standardize quotes ------------------------------------------------------

	txt = txt.replace(/\'\' /g, '" '); 
	txt = txt.replace(/ \`\`/g, ' "');
	txt = txt.replace(/"/g, ' " ');

	// Put space after any period followed by a non-number and non-period ------

	txt = txt.replace(/\.([^0-9\.])/g, ". $1");

	// Put space before any period that's followed by a space or another period, 
	// unless preceded by another period. The following space is introduced in 
	// the previous command.

    txt = txt.replace(/([^\.])\.([ \.])/g, "$1 .$2");

	// Put space around sequences of colons and commas, unless they're ---------
	// surrounded by numbers or other colons and commas

    txt = txt.replace(/([0-9:])\:([0-9:])/g, "$1<CLTKN>$2");
    txt = txt.replace(/\:/g, " \: ");
    txt = txt.replace(/([0-9]) ?<CLTKN> ?([0-9])/g, "$1\:$2");
    txt = txt.replace(/([0-9,])\,([0-9,])/g, "$1<CMTKN>$2");
    txt = txt.replace(/\,/g, " \, ");
    txt = txt.replace(/([0-9]) ?<CMTKN> ?([0-9])/g, "$1\,$2");
    
	// Put space before any other punctuation and special symbol sequences. ----

//     txt = txt.replace(/([^ !?;\")(\/&^%\$+#*\[\]{}><_\\|=`²³«»¢°-])(\1+)/g, "$1 $2");
     txt = txt.replace(/([!?;\")(\/&^%\$+#*\[\]{}><_\\|=²³«»¢°-]+)([^ !?;\")(\/&^%\$+#*\[\]{}><_\\|=²³«»¢°-])/g, "$1 $2");

	// separate alphabetical tokens --------------------------------------------
	// FIXME -- catches accented characters!

    txt = txt.replace(/([a-zA-Z]+\'?[a-zA-z]+)/g, " $1 ");    
    
	txt = txt.split(/\s+/);
	if(!txt[0])
		txt.shift();

    return txt;
}


//==============================================================================
// Searches mcu.docs[idx].content for a match of ngram, which is supplied as an
// array of strings. If exact is true, no normalization is performed. If the
// optional partial argument is supplied as an integer, matches down to partial
// size will be included. The result is structured thus:
//
//        matches[ngramSize][ offset1, offset2, offset3, ... ]
//
// Since this is the most computationally intensive part of the program,
// the conditionals for exact and partial are everted from the main loop, which
// is duplicated to cover the four basic combinations.
//==============================================================================

function ngramSearch(idx, ngram, exact, partial) {
	var tokens = mcu.docs[idx].content;
	var matches = [ ];

	if(partial != undefined) {
		for(var i = partial; i <= ngram.length; i++) {
			matches[i] = [ ];
		}
	} else {
		matches[ngram.length] = [ ];
		partial = false;
	}
	
	if(exact == undefined) {
		exact = false;
	}

	var startTime = new Date();

	if(exact && partial) { //---------------------------------------------------

		for(var i = 0; i < tokens.length; i++) {
			if(tokens[i] == ngram[0]) {
				var mismatch = 0;
				for(var t = 1; t < ngram.length; t++) {
					if(ngram[t] != tokens[i + t]) {
						mismatch = t;
						break;
					}
				}
				if(!mismatch) {
					matches[ngram.length].push(i);
				} else if(mismatch >= partial) {
					matches[mismatch].push(i);
				}
			}
		}

	} else if(exact && !partial) { //-------------------------------------------

		for(var i = 0; i < tokens.length; i++) {
			if(tokens[i] == ngram[0]) {
				var mismatch = false;
				for(var t = 1; t < ngram.length; t++) {
					if(ngram[t] != tokens[i + t]) {
						mismatch = true;
						break;
					}
				}
				if(!mismatch) {
					matches[ngram.length].push(i);
				}
			}
		}

	} else if(!exact && partial) { //-------------------------------------------

		for(var i = 0; i < tokens.length; i++) {
			if(tokens[i].toLowerCase() == ngram[0]) {
				var mismatch = 0;
				for(var t = 1; t < ngram.length; t++) {
					if(ngram[t] != tokens[i + t].toLowerCase()) {
						mismatch = t;
						break;
					}
				}
				if(!mismatch) {
					matches[ngram.length].push(i);
				} else if(mismatch >= partial) {
					matches[mismatch].push(i);
				}
			}
		}

	} else if(!exact && !partial) { //------------------------------------------

		for(var i = 0; i < tokens.length; i++) {
			if(tokens[i].toLowerCase() == ngram[0]) {
				var mismatch = false;
				for(var t = 1; t < ngram.length; t++) {
					if(ngram[t] != tokens[i + t].toLowerCase()) {
						mismatch = true;
						break;
					}
				}
				if(!mismatch) {
					matches[ngram.length].push(i);
				}
			}
		}

	}

	var endTime = new Date();
	var runTime = endTime.getTime() - startTime.getTime();

	if(mcu.diagnostics) {
		var msg = "@ngramSearch(" + idx + ", [ " + ngram + "], " + exact + ", " + partial + ");\n" +
			"Runtime: " + runTime + " msec\n" +
			"Output: " + Dumper(matches) + "\n";
		debug(msg);
	}

	return matches;
}


//==============================================================================
// Returns an array containing the indices of mcu.docs where active is true,
// randomly ordered using their weights, i.e., the document with the highest
// weight is most likely but not guaranteed to come first, and the document with
// the lowest weight is most likely but not guaranteed to come last.
//==============================================================================

function documentOrdering() {
	var docs = [ ];

	for(var i in mcu.docs) {
		if(mcu.docs[i].active) {
			docs.push(i);
		}
	}

	var docs = docs.sort( function(a, b) { return (Math.random() * mcu.docs[a].weight) - (Math.random() * mcu.docs[b].weight); } );

	if(mcu.diagnostics) {
		var msg = "@documentOrdering();\n" +
			"Output: [ " + docs + "]\n";
	}

	return docs;
}


//==============================================================================
// Given any array, returns a randomly sorted copy of it.
//==============================================================================

function randomSort(ary) {
	var result = ary.slice(0);

	for(var i = 0; i < 10; i++)
		result.sort( function(a, b) { return Math.random() - Math.random(); } );

	if(mcu.diagnostics) {
		var msg = "@randomSort( [ " + ary + " ] );\n" +
			"Output: [ " + result + " ]\n";
	}

	return result;
}


//==============================================================================
// Takes an array of tokens and an array of strings and/or regular expressions
// and returns a copy of the first array with matching elements removed.
//==============================================================================

function purgeTokens(tokens, purge) {
	var result = [ ];

	if(purge.length == 0)
		return tokens.slice(0);

	for(var ti = 0; ti < tokens.length; ti++) {
		var matched = false;
		for(var pi = 0; pi < purge.length; pi++) {
			if(purge[pi] instanceof RegExp) {
				if(tokens[ti].search(purge[pi]) != -1) {
					matched = true;
					break;
				}
			} else {
				if(tokens[ti] == purge[pi]) {
					matched = true;
					break;
				}
			}
		}
		if(!matched) {
			result.push(tokens[ti]);
		}
	}
	return result;
}


//==============================================================================
// Appends msg to the contents of the element with the id "debug_console" if it
// exists.
//==============================================================================

function debug(msg) {
	var obj = document.getElementById("debug_console");

	if(obj) {
		obj.innerHTML += msg + "\n";
	}
}

