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

    static Babble(options) {
        return new Babble(options);
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
        //     jones: { weight: 1.0, content: [ ], active: true, title, sort: 1 }

        this._docs           = { };
        this._inputFilter    = ['"'];        // array of tokens/regexps to purge from input
        this._outputFilter   = null;         // filter to use on output
        this._msgQueue       = null;         // callback to put messages in queue
        this._diagnostics    = false;
        this._dict           = new Dictionary({ normalize: true });

    }

    //--------------------------------------------------------------------------
    // Tokenizes a block of text and stores it in this._docs. The arguments are as
    // follows:
    //
    //      content ... The string to be parsed.
    //      docId ..... Object key for this._docs.
    //      title...... If non-null, this is a string to be used as the title of
    //                  the document.
    //      append .... Boolean. If true, appends; if false, overwrites.
    //      filter .... Boolean. Specifies whether to apply the current input
    //                  filter settings.
    //--------------------------------------------------------------------------

    parseDocument(content, docId, title = null, append = true, filter = true) {

        var startTime = new Date();
        var tokens    = this.encodeTokens(this.tokenize(content));
        var endTime   = new Date();
        var runTime   = endTime - startTime;

        var msg = "@parseDocument([content], " + docId + ", " + title + ", " + append + ", " + filter + ");\n" +
            "Input size:  " + content.length + " bytes\n" +
            "Token count: " + tokens.length + "\n" +
            "Run time:    " + Math.round(runTime / 1000) + " seconds (" + runTime + " msecs)\n" +
            "Byte rate:   " + (runTime / content.length) + " msec per byte\n" +
            "Token rate:  " + (runTime / tokens.length) + " msec per token\n";

        if(this._docs[docId] === undefined) {
            this._docs[docId] = { title: "", weight: 0.0, content: [ ], active: false };
            msg += "Created new document " + docId + ".\n";
        }

        if(title != null)
            this._docs[docId].title = title;

        if(filter)
            tokens = this.purgeTokens(tokens, this._inputFilter);

        if(append) {
            while(tokens.length) {
                this._docs[docId].content.push(tokens.shift());
            }
            msg += "Appended input to existing document " + docId + " (" + this._docs[docId].title + ").\n";
        } else {
            this._docs[docId].content = tokens;
            msg += "Replaced content of document " + docId + " (" + this._docs[docId].title + ").\n";
        }
        if(this._diagnostics) {
            debug(msg);
        }
    }


    //--------------------------------------------------------------------------
    // Takes an array of tokens as strings and returns an array of dictionary
    // indices, adding new entries as needed.
    //--------------------------------------------------------------------------

    encodeTokens(tokens) {
        var result = [ ];
        for(var t = 0; t < tokens.length; t++)
            result.push(this._dict.wordToIdx(tokens[t]));

        return result;
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
    // Searches the specified doc for matching ngrams.
    //
    //     doc ....... the index key from this._docs
    //     ngram ..... an array of dictionary indices
    //     fallback .. the minimum number of tokens to fall back to
    //     norm ...... allow normalized fuzzy matches
    //
    // If no matches are found, boolean false is returned.
    //--------------------------------------------------------------------------

    ngramSearch(doc, ngram, fallback = false, norm = false) {

        if(!fallback)
            fallback = ngram.length;

        var maxLength = ngram.length;

        ngram = ngram.slice(0);  // max local, mutable copy

        var matches    = [ ];

        for(var i = 0; i <= ngram.length; i++)
            matches[i] = [ ];

        var content = this._docs[doc].content;

        for(var len = ngram.length; len >= fallback; len--) {  // loop through allowed ngram lengths

            // At this level, we are looping through shorter and shorter ngrams
            // within the limits imposed by fallback. We start by trimming the
            // beginning of the ngram array until it equals the current value of
            // len.

            var subgram = ngram.slice(0);
            while(subgram.length > len)
                subgram.shift();


            // If we're allowing normalized matches, we go ahead and create a
            // normalized version of the ngram.

            if(norm) {
                var normgram = this._dict.idxToNormIdx(subgram);
            }

            var end = content.length - subgram.length;
            for(var t = 0; t < end; t++) {

                // At this level, we're looping through the array of indices
                // encoded in the doc. In the inner loop(s) below, we check
                // at each position to see if we have a match with the ngram
                // and, if norm is enabled, the normalized ngram.

                // The search is a brute-force linear search that can and should
                // be optimized to use something like a Boyer-Moore search later.

                var match = true;
                for(var m = 0; m < subgram.length; m++) {
                    if(content[t + m] != subgram[m] && (!norm || content[t + m] != normgram[m])) {
                        match = false;
                        break;
                    }
                }
                if(match) {
                    matches[subgram.length].push(t);
                }

            }
        }

        for(var i = 0; i < matches.length; i++)
            if(matches[i].length == 0)
                matches[i] = null;

        return matches;
    }


    //--------------------------------------------------------------------------
    // Constructs a sentence.
    //
    //     docIds...... array of document ids to search in order.
    //     n .......... preferred ngram overlap length
    //     m .......... minimum overlap length
    //     sentence ... an array, possibly empty, of dictionary indices.
    //     limit ...... maximum number of words in sentence.
    //
    // The sentence array is altered in place. The return value is a boolean
    // indicating success (sentence completion) or failure.
    //--------------------------------------------------------------------------

    // TODO

    sentenceBuild(docs, n, m, sentence, limit) {

        // If sentence is empty, find an initial ngram -------------------------

        if(sentence.length == 0) {

        }


        while(sentence.length < limit) {

            // find overlapping ngrams
            // select random ngram, preferring those closer to n
            // copy new words to sentence, bailing early if sentence complete

        }

        return true;
    }


    //--------------------------------------------------------------------------
    // Given a document ID, return n words at the beginning of a random sentence
    // therein. For our purposes, the beginning of a sentence is the first word
    // beginning with a letter following one of .,'"?!
    //
    // Returns boolean false if unable to find a suitable ngram.
    //--------------------------------------------------------------------------

    findStartOfSentence(docId, n) {
        var doc = this._docs[docId];
        if(doc === undefined)
            throw new Error("Undefined document \"" + docId + ".");
        doc = doc.content;

        var offset = Math.floor(Math.random() * doc.length);
        var current = (offset + 1) % doc.length;

        var nextWord = false;
        do {
            current++;
            if(current == doc.length - n)
                current = 0;
            var word = this._dict.idxToWord(doc[current]);
            if(nextWord) {
                if(word.match(/^[A-Za-z]/) && current < doc.length - (n - 1)) {
                    return doc.slice(current, current + n);
                } else {
                    nextWord = false;
                }
            }
            if(word == "." || word == "," || word == "'" || word == '"' || word == "?" || word == "!") {
                nextWord = true;
                continue;
            }
        } while(current != offset);

        return false;
    }


    //--------------------------------------------------------------------------
    // Returns an array containing the indices of this._docs where active is true,
    // randomly ordered using their weights, i.e., the document with the highest
    // weight is most likely but not guaranteed to come first, and the document
    // with the lowest weight is most likely but not guaranteed to come last.
    //--------------------------------------------------------------------------

    // FIXME

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
        console.log(msg);
    }

}


//==============================================================================
// Generic dictionary class.
//==============================================================================

class Dictionary extends TextrixBase {

    constructor(options = { }) {
        super(options);

        this._normalize = options.normalize !== undefined ? options.normalize : false;

        this._idxToWord = [ ];
        this._wordToIdx = { };
    }

    //--------------------------------------------------------------------------
    // Returns the index of a word, creating a new dictionary entry if
    // necessary. If this._normalize, a normalized version is created as needed,
    // but its value is not returned.
    //--------------------------------------------------------------------------

    _wordToIndex(word) {

        word = word.toString();

        if(this._wordToIdx[word] === undefined) {
            var idx = this._idxToWord.length;
            this._wordToIdx[word] = idx;
            this._idxToWord[idx] = word;

            if(this._normalize) {
                var normWord = word.toLocaleLowerCase();
                if(word != normWord) {
                    var idx2 = this._idxToWord.length;
                    this._wordToIdx[normWord] = idx2;
                    this._idxToWord[idx2] = normWord;
                }
            }

            return idx;
        } else {
            return this._wordToIdx[word];
        }
    }

    //--------------------------------------------------------------------------
    // Converts a word (or array of words) to an index (or array of indices)
    //--------------------------------------------------------------------------

    wordToIdx(word) {
        if(Array.isArray(word)) {
            var result = [ ];
            for(var i = 0; i < word.length; i++)
                result.push(this._wordToIndex(word[i]));
            return result;
        } else {
            return this._wordToIndex(word);
        }
    }

    //--------------------------------------------------------------------------
    // Given a word, returns its normalized index value. If word is an array,
    // and array of ints will be returned.
    //--------------------------------------------------------------------------

    wordToNormIdx(word) {
        if(Array.isArray(word)) {
            var result = [ ];
            for(var i = 0; i < word.length; i++)
                result.push(this._wordToIdx[word[i].toString().toLocaleLowerCase()]);
            return result;
        } else {
            return this.wordToIdx(word.toString().toLocaleLowerCase());
        }
    }

    //--------------------------------------------------------------------------
    // Given an index or array of indices, return the normalized index or an
    // array of normalized indices. Obviously -- though worth noting -- indices
    // that already represent the normal form will come through unchanged.
    //--------------------------------------------------------------------------

    idxToNormIdx(idx) {
        if(Array.isArray(idx)) {
            var result = this.idxToWord(idx);
            return this.wordToNormIdx(result);
        } else {
            var word = this.idxToWord(idx);
            return this.wordToNormIdx(result);
        }
    }

    //--------------------------------------------------------------------------
    // Given an index or array of indices, returns the word or array of words
    // they encode.
    //--------------------------------------------------------------------------

    idxToWord(idx) {
        if(Array.isArray(idx)) {
            var result = [ ];
            for(var i = 0; i < idx.length; i++)
                result.push(this._idxToWord[idx[i]]);
            return result;
        } else {
            return this._idxToWord[idx];
        }
    }

    //--------------------------------------------------------------------------
    // Returns an object containing dictionary stats.
    //--------------------------------------------------------------------------

    statistics() {
        return {
            tokenCount: this._idxToWord.length
        };
    }

}

module.exports = Textrix;



