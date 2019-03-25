#!/usr/bin/env node

const Textrix = require("./textrix.lib.js");
const minicle = require("minicle");
const ac      = require("ansi-colors");



function main() {

    var optionMap = {
        chain: {
            "infile":  { short: "i", vals: [ ] },
            "count":   { short: "c", vals: [ ], max: 1 },
        },
        grammar: {
            "grammar":  { short: "i", vals: [ ] },
            "text":     { short: "t", vals: [ ] },
            "tokens":   { short: "T", vals: [ ], max: 1 },
            "iter":     { short: "n", vals: [ ], max: 1 },
        },
        babble: {
            "infile":   { short: "i", vals: [ ] },
        },
        "@all": {
            debug:   { short: "d", cnt: 0 },
            quiet:   { short: "q", cnt: 0 },
            verbose: { short: "v", cnt: 0 },
        }
    };

}


//==============================================================================
// Outputs the runtime header to console. This will become progressively more
// ostentatious and ridiculous as time goes by.
//==============================================================================

function outputHeader(version) {

    console.log(
        "\n" + ac.blue("===========================================================================") + "\n"
        + ac.yellow.bold("         Textrix  v" + version + " -- Minimalist Unit/Regression Test Tool") + "\n"
        + ac.blue("===========================================================================") + "\n"
    );

}




function test() {

    var links = [
        [ 0, "The", 1],
        [ 0, "A",   1],

        [ 1, "Duchess", 2 ],
        [ 1, "Bishop",  2 ],
        [ 1, "Cafe",    2 ],

        [ 2, "of Denmark",     3 ],
        [ 2, "in Distress",    3 ],
        [ 2, "without Qualms", 3 ],
    ];

    var tc = Textrix.TagChain({ start: 0, maxSize: 10 });

    tc.linksAdd(links);

    // console.log(tc._cfg.links);

    for(var i = 0; i < 10; i++)
        console.log(tc.getChain().join(" "));

    //--------------------------------------------------------------

    var sg = Textrix.SimpleGrammar();

    var text = "I am a little [ware]";

    sg.textParse(text);
    sg.ruleSet("ware", [["teapot", 2], ["program", 1]]);
    sg.transform();
    console.log(sg.textFinalize());

}
