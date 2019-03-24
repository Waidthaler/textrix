//==============================================================================
// Basically a factory and utility class.
//==============================================================================

class Textrix {

    static randomElement(ary) {
        return ary[Math.floor(Math.random() * ary.length));
    }
}


//==============================================================================
//
//==============================================================================

class TagChain {

    constructor(options) {
        this._cfg           = { };
        this._cfg.headToIdx = { };
        this._cfg.idxToHead = [ ];
        this._cfg.tailToIdx = { };
        this._cfg.idxToTail = [ ];
        this._cfg.bag       = [ ];
        this._cfg.start     = null;
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
            throw new Error("Arguments to TagChain.linkAdd must be convertible to strings.";

        head = head.toString();
        body = body.toString();
        tail = tail.toString();

        this._addLinkToBag(head, body, tail);
    }

    //--------------------------------------------------------------------------
    // Takes care of all of the bookkeeping involved in adding a link.
    //--------------------------------------------------------------------------

    _addLinkToBag(head, body, tail) {

        if(this._cfgheadToIdx{head} == undefined) {
            var headOffset = this._cfgidxToHead.length;
            this._cfgheadToIdx{head} = headOffset;
            this._cfgidxToHead[headOffset] = head;
        }
        if(this._cfgtailToIdx{tail} == undefined) {
            var tailOffset = this._cfgidxTotail.length;
            this._cfgtailToIdx{tail} = tailOffset;
            this._cfgidxTotail[tailOffset] = tail;
        }

        if(this._cfgbag[head] === undefined)
            this._cfgbag[head] = [ ];
        if(this._cfgbag[head][tail] === undefined)
            this._cfgbag[head][tail] = [ ];

        this._cfgbag[head][tail].push(body);
    }

    //--------------------------------------------------------------------------
    // Accessors for start head.
    //--------------------------------------------------------------------------

    set start(val) {
        if(val.toString === undefined)
            throw new Error("The start symbol for a TagChain must be convertible to a string.");
        this._cfg.start = val;
    }

    get start() {
        return this._cfg.start;
    }

    //--------------------------------------------------------------------------
    // Retrieves the array of links whose head and/or tail match the specified
    // values.
    //--------------------------------------------------------------------------

    _getLinks(head = null, tail = null) {

    }


    //--------------------------------------------------------------------------
    // Verify that the basic conditions are met to generate a chain.
    //--------------------------------------------------------------------------

    _startTest() {
        if(this._cfg.start === null)
            throw new Error("The start symbol of this TagChain has not been set.");

        // TODO: get count of links whose head == start

    }

}