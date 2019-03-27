var File     = require("./lib/file.js");
const {dump} = require('dumper.js');

//==============================================================================
// Basically a factory class.
//==============================================================================

class Textrix {

    static TagChain(options) {
        return new TagChain(options);
    }

    static SimpleGrammar(options) {
        return new SimpleGrammar(options);
    }

}


//==============================================================================
// Generic base class for the others, mostly contains utility methods.
//==============================================================================

class TextrixBase {

    constructor(options) {

    }

    randomElement(ary) {
        return ary[Math.floor(Math.random() * ary.length)];
    }

}

//==============================================================================
// Constructor of random chains of "links", strings with head and tail markers.
// Starts with the start marker and randomly adds links that match the tail of
// the previous link until no more can be added.
//==============================================================================

class TagChain extends TextrixBase {

    constructor(options) {
        super(options);

        this._cfg          = { };
        this._cfg.tagToIdx = { };
        this._cfg.idxToTag = [ ];

        this._cfg.links    = [ ];
        this._cfg.start    = null;
        this._cfg.maxSize  = 100;

        if(options !== undefined) {
            if(options.start !== undefined)
                this.start = options.start;
            if(options.maxSize !== undefined)
                this.maxSize = options.maxSize;
        }

    }

    //--------------------------------------------------------------------------
    // Adds a link to the bag. This can be passed as a simple array, an object,
    // or three successive arguments:
    //
    //     [head, body, tail]  // or...
    //     {head: head, body: body, tail: tail} // or...
    //     addlink(head, body, tail)
    //
    // In all cases, the arguments must be strings or have a .toString method.
    //--------------------------------------------------------------------------

    linkAdd(head, body = null, tail = null) {
        if(Array.isArray(head)) {
            if(head.length != 3) {
                throw new Error("Array arguments to TagChain.linkAdd must have three elements.");
            } else {
                body = head[1];
                tail = head[2];
                head = head[0];
            }
        } else if(typeof head == "object") {
            if(head.head === undefined || head.body === undefined || head.tail === undefined) {
                throw new Error("Option arguments to TagChain.linkAdd must have head, body, and tail elements.");
            } else {
                body = head.body;
                tail = head.tail;
                head = head.head;
            }
        }
        if(head.toString === undefined || body.toString === undefined || tail.toString === undefined)
            throw new Error("Arguments to TagChain.linkAdd must be convertible to strings.");

        head = head.toString();
        body = body.toString();
        tail = tail.toString();

        this._addLink(head, body, tail);
    }

    //--------------------------------------------------------------------------
    // Adds an array of links at once.
    //--------------------------------------------------------------------------

    linksAdd(links) {
        for(var i = 0; i < links.length; i++)
            this.linkAdd(links[i]);
    }

    //--------------------------------------------------------------------------
    // Takes care of all of the bookkeeping involved in adding a link.
    //--------------------------------------------------------------------------

    _addLink(head, body, tail) {

        head = head.toString();
        tail = tail.toString();

        var headIdx = this._getIdx(head);
        if(this._cfg.links[headIdx] === undefined)
            this._cfg.links[headIdx] = [ ];
        var tailIdx = this._getIdx(tail);

        this._cfg.links[headIdx].push([body, tailIdx]);
    }

    //--------------------------------------------------------------------------
    // Retrieves a tag index, creating a new one if necessary.
    //--------------------------------------------------------------------------

    _getIdx(val) {
        if(this._cfg.tagToIdx[val] == undefined) {
            var idx = this._cfg.idxToTag.length;
            this._cfg.tagToIdx[val] = idx;
            this._cfg.idxToTag[idx] = val;
        } else {
            var idx = this._cfg.tagToIdx[val];
        }

        return idx;
    }

    //--------------------------------------------------------------------------
    // Accessors for start tag.
    //--------------------------------------------------------------------------

    set start(val) {
        if(val.toString === undefined)
            throw new Error("The start symbol for a TagChain must be convertible to a string.");
        this._cfg.start = this._getIdx(val);
    }

    get start() {
        return this._cfg.start;
    }

    //--------------------------------------------------------------------------
    // Accessors for maxSize.
    //--------------------------------------------------------------------------

    set maxSize(val) {
        if(typeof val !== "number" || val < 1)
            throw new Error("maxSize must be a positive integer.");
        this._cfg.maxSize = Math.floor(val);
    }

    get maxSize() {
        return this._cfg.maxSize;
    }

    //--------------------------------------------------------------------------
    // Produces a random chain.
    //--------------------------------------------------------------------------

    getChain() {
        if(this._cfg.start === null)
            throw new Error("The start symbol of this TagChain has not been set.");

        var chain = [ ];
        var lookFor = this.start;

        while(this._cfg.links[lookFor] !== undefined && chain.length < this._cfg.maxSize) {
            var link = this.randomElement(this._cfg.links[lookFor]);
            chain.push(link[0]);
            lookFor = link[1];
        }

        return chain;
    }

}


//==============================================================================
// The SimpleGrammar class implements a *very* simple and informal
// transformation grammar which it can use to generate random text. It requires
// a working text consisting of plain text in which nonterminal symbols are
// enclosed in square brackets, which cannot be nested. The rules consist of the
// nonterminals mapped to replacement strings which can contain further
// nonterminals. Whitespace is used as a token delimiter and basic punctuation
// is handled somewhat intelligently. (This is currently highly biased to
// English orthography. If you want it to work better with your language, I am
// completely open to suggestions.)
//==============================================================================

class SimpleGrammar extends TextrixBase {

    constructor(options = { }) {
        super(options);

        this._rules         = { };
        this._rulesFile     = null;
        this._text          = [ ];
        this._maxTokens     = Infinity;
        this._maxIterations = Infinity;
        this._currentRule   = null;
        this._currentSymbol = null;

        if(options.rules !== undefined)
            this._rules = options.rules;

        if(options.text !== undefined) {
            if(Array.isArray(options.text)) {
                this._text = options.text;
            } else {
                this._text = this.textParse(options.text);
            }
        }

        if(options.rulesFile !== undefined) {
            this._rulesFile = option.rulesFile;
            this.rulesLoad(this._rulesFile);
        }

        if(options.maxTokens !== undefined)
            this._maxTokens = options.maxTokens;

        if(options.maxIterations !== undefined)
            this._maxIterations = options.maxIterations;
    }

    //--------------------------------------------------------------------------
    // Creates a rule specifying a nonterminal symbol and replacements. The
    // replacements argument is an array with elements of the form [replacement,
    // weight].
    //--------------------------------------------------------------------------

    ruleSet(nonterminal, replacements) {
        if(!Array.isArray(replacements))
            throw new Error("The replacements argument in ruleSet must be an array of at least one element.", "SimpleGrammar.ruleSet");
        for(var i = 0, sum = 0; i < replacements.length; i++) {
            // TODO: validation
            sum += replacements[i][1];
        }
        this._rules[nonterminal] = { replacements: replacements, sum: sum };
    }


    //--------------------------------------------------------------------------
    // Loads a rules file. The syntax is similar to an ini file. Blank lines
    // and comments (beginning with '//') are ignored. Nonterminals are enclosed
    // in square brackets, and everything up to the next nonterminal is a
    // replacement. Replacements are one per line, optionally introduced by an
    // +integer weight and a colon. Everything after the colon and any adjacent
    // whitespace is the replacement. The default weight is 1.
    //
    // [nonterminal]        // more formats may be supported in the future
    // 30: foo
    // 15: bar
    //
    // Multiple files can be loaded. Duplicate nonterminals append their values
    // to the earlier ones.
    //--------------------------------------------------------------------------

    rulesLoad(filename) {
        var fp = new File(filename, "r");
        if(!fp.open)
            error("fatal", "Unable to open grammar file \"" + filename + "\" for reading.", "SimpleGrammar.rulesLoad");
        var tmp = fp.read();
        tmp = tmp.split(/\n+/);
        var lines = [ ];
        while(tmp.length) {
            var line = tmp.shift().replace(/\/\/.*/g, "").trim();
            if(line.length)
                lines.push(line);
        }

        var nonterminal = /^\[([^\]]+)\]/;
        var replacement = /^(([0-9]+):)?\s*(.*)/;

        var currentNonterminal = null;
        var currentReplacements = [ ];

        for(var i = 0, match; i < lines.length; i++) {
            if(match = lines[i].match(nonterminal)) {
                if(currentNonterminal !== null && currentReplacements.length)
                    this.ruleSet(currentNonterminal, currentReplacements);
                currentNonterminal = match[1];
                currentReplacements = [ ];

            } else if((match = lines[i].match(replacement)) && currentNonterminal !== null) {
                var weight = match[2] === undefined ? 1 : parseInt(match[2]);
                var str    = this.textParse(match[3]);

                if(isNaN(weight) || weight < 1)
                    error("fatal", "Invalid weight: " + lines[i], "SimpleGrammar.rulesLoad");

                currentReplacements.push([str, weight]);
            }
        }
        if(currentNonterminal !== null && currentReplacements.length)
            this.ruleSet(currentNonterminal, currentReplacements);
    }

    //--------------------------------------------------------------------------
    // Given a rule, returns one of the weighted replacements.
    //--------------------------------------------------------------------------

    getReplacement(nonterminal) {
        if(this._rules[nonterminal] === undefined)
            return nonterminal;
        var rule = this._rules[nonterminal];
        var num  = Math.floor(rule.sum * Math.random());
        for(var i = 0, sum = 0; i < rule.replacements.length; i++) {
            if((sum + rule.replacements[i][1]) > num)
                return rule.replacements[i][0];
            sum += rule.replacements[i][1];
        }
        throw new Error("Overran end of replacements list in getReplacement.");
    }


    //--------------------------------------------------------------------------
    // Breaks an input text into tokens.
    //--------------------------------------------------------------------------

    textParse(text) {
        return text.trim().replace(/n't/g, "#NT#")
            .replace(/(\S+)'s/g, "$1#APOS#")
            .replace(/\n/g, " #CR# ")
            .replace(/([^#\[\]A-Za-z])/g, " $1 ")
            .replace(/#APOS#/g, "'s")
            .replace(/#NT#/g, "n't")
            .split(/\s+/);
    }

    //--------------------------------------------------------------------------
    // Performs a replacement iteration on the text, returning true if
    // replacements were made and false otherwise.
    //--------------------------------------------------------------------------

    rulesApply() {
        var rcnt = 0;
        var text = [ ];

        for(var i = 0; i < this._text.length; i++) {
            if(this._text[i].substr(0, 1) == "[" && this._text[i].substr(-1) == "]") {
                var replacement = this.getReplacement(this._text[i].substr(1, this._text[i].length - 2));
                for(var j = 0; j < replacement.length; text.push(replacement[j++]));
                 rcnt++;
            } else {
                text.push(this._text[i]);
            }
        }
        this._text = text;
        return rcnt ? true : false;
    }

    //--------------------------------------------------------------------------
    // Applies transformation rules until no changes occur or the resource
    // limits are exceeded.
    //--------------------------------------------------------------------------

    transform() {
        var iter = 0;
        while(true) {
            var result = this.rulesApply();
            if(!result)
                break
            if(this._text.length >= this._maxTokens || this._maxIterations <= ++iter)
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Converts the text back into a string and returns it. TODO: Much massaging
    // of punctuation and whitespace.
    //--------------------------------------------------------------------------

    textFinalize() {
        var result = this._text.join(" ");
        result = result.replace(/\s+([!\.\?:;,]+)/g, "$1");
        return result;
    }

}


//==============================================================================
// This is the Babble clone class.
//==============================================================================

class Babble extends TextrixBase {

    constructor(options = { }) {
        super(options);

        // The _docs object consists of named, parsed document objects, e.g.,
        //     jones: { weight: 1.0, content: [ ], active: true, sort: 1 }

        this._docs           = { };
        this._userDoc        = null;         // the name of the "you" doc.
        this._runMode        = "monologue";  // can be "monologue" or "dialogue"
        this._inputFilter    = ['"'];        // array of tokens/regexps to purge from input
        this._outputFilter   = null;         // filter to use on output


    }

    //--------------------------------------------------------------------------
    // Tokenizes a block of text and stores it in mcu.docs. The arguments are as
    // follows:
    //
    //      content ... The string to be parsed.
    //      doc ....... This is either an integer index into mcu.docs, or it is
    //                  null, in which case it is created as a new member of
    //                  mcu.docs.
    //      name ...... If non-null, this is a string to be used as the title of
    //                  the document. (Typically null when appending to an
    //                  existing document.
    //      append .... Boolean. If true, appends; if false, overwrites.
    //      filter .... Boolean. Specifies whether to apply the current input
    //                  filter settings.
    //--------------------------------------------------------------------------

    parseDocument(content, doc, name, append, filter) {

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
            this._docs.push( { name: "", weight: 0.0, content: [ ], active: false } );
            doc = this._docs.length - 1;
            msg += "Created new document " + doc + ".\n";
        }
        if(name != null) {
            this._docs[doc].name = name;
        }
        if(filter) {
            tokens = purgeTokens(tokens, this._inputFilter);
        }
        if(append) {
            while(tokens.length) {
                this._docs[doc].content.push(tokens.pop());
            }
            msg += "Appended input to existing document " + doc + " (" + this._docs[doc].name + ").\n";
        } else {
            this._docs[doc].content = tokens;
            msg += "Replaced content of document " + doc + " (" + this._docs[doc].name + ").\n";
        }
        if(this._diagnostics) {
            debug(msg);
        }
    }


    //--------------------------------------------------------------------------
    // Given a block of natural language text, tokenize() breaks it into tokens
    // and returns it as an array.
    //--------------------------------------------------------------------------

    tokenize(txt) {

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


    //--------------------------------------------------------------------------
    // Searches this._docs[idx].content for a match of ngram, which is supplied as
    // an array of strings. If exact is true, no normalization is performed. If
    // the optional partial argument is supplied as an integer, matches down to
    // partial size will be included. The result is structured thus:
    //
    //        matches[ngramSize][ offset1, offset2, offset3, ... ]
    //
    // Since this is the most computationally intensive part of the program,
    // the conditionals for exact and partial are everted from the main loop,
    // which is duplicated to cover the four basic combinations.
    //--------------------------------------------------------------------------

    ngramSearch(idx, ngram, exact, partial) {
        var tokens = this._docs[idx].content;
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

        if(this._diagnostics) {
            var msg = "@ngramSearch(" + idx + ", [ " + ngram + "], " + exact + ", " + partial + ");\n" +
                "Runtime: " + runTime + " msec\n" +
                "Output: " + Dumper(matches) + "\n";
            debug(msg);
        }

        return matches;
    }


    //--------------------------------------------------------------------------
    // Returns an array containing the indices of this._docs where active is true,
    // randomly ordered using their weights, i.e., the document with the highest
    // weight is most likely but not guaranteed to come first, and the document
    // with the lowest weight is most likely but not guaranteed to come last.
    //--------------------------------------------------------------------------

    documentOrdering() {
        var docs = [ ];

        for(var i in this._docs) {
            if(this._docs[i].active) {
                docs.push(i);
            }
        }

        var docs = docs.sort( function(a, b) { return (Math.random() * this._docs[a].weight) - (Math.random() * this._docs[b].weight); } );

        if(this._diagnostics) {
            var msg = "@documentOrdering();\n" +
                "Output: [ " + docs + "]\n";
        }

        return docs;
    }


    //--------------------------------------------------------------------------
    // Given any array, returns a randomly sorted copy of it.
    //--------------------------------------------------------------------------

    randomSort(ary) {
        var result = ary.slice(0);

        for(var i = 0; i < 10; i++)
            result.sort( function(a, b) { return Math.random() - Math.random(); } );

        if(this._diagnostics) {
            var msg = "@randomSort( [ " + ary + " ] );\n" +
                "Output: [ " + result + " ]\n";
        }

        return result;
    }


    //--------------------------------------------------------------------------
    // Takes an array of tokens and an array of strings and/or regular expressions
    // and returns a copy of the first array with matching elements removed.
    //--------------------------------------------------------------------------

    purgeTokens(tokens, purge) {
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


    //--------------------------------------------------------------------------
    // Appends msg to the contents of the element with the id "debug_console" if it
    // exists.
    //--------------------------------------------------------------------------

    debug(msg) {
        var obj = document.getElementById("debug_console");

        if(obj) {
            obj.innerHTML += msg + "\n";
        }
    }

}


module.exports = Textrix;



