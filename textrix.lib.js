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
                this.start = options.start;
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

        while(this._cfg.links[lookFor] !== undefined && chain.length <= this._cfg.maxSize) {
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

    constructor(options) {
        super(options);

        this._rules         = [ ];
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

        if(options.maxTokens !== undefined)
            this._maxTokens = options.maxTokens;

        if(options.maxIterations !== undefined)
            this._maxIterations = options.maxIterations;
    }

    //--------------------------------------------------------------------------
    // Creates a rule specifying a nonterminal symbol and its replacment.

    ruleSet(nonterminal, replacement) {
        this._rules.push([nonterminal, replacement]);
    }

    textParse(text) {

    }
}


module.exports = Textrix;
