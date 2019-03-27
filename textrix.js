#!/usr/bin/env node

const version   = "0.0.1";
var   verbosity = 1;

const Textrix = require("./textrix.lib.js");
const minicle = require("minicle");
const ac      = require("ansi-colors");
const File    = require("./lib/file.js");
const {dump}  = require('dumper.js');

main();

function main() {

    var optionMap = {
        chain: {
            "infile":   { short: "i", vals: [ ] },
            "count":    { short: "c", vals: [ ], max: 1 },
            "start":    { short: "s", vals: [ ], max: 1 },
            "max-size": { short: "m", vals: [ ], max: 1 },
        },
        grammar: {
            "grammar":  { short: "g", vals: [ ] },
            "text":     { short: "t", vals: [ ] },
            "tokens":   { short: "T", vals: [ ], max: 1 },
            "iter":     { short: "i", vals: [ ], max: 1 },
        },
        babble: {
            "infile":   { short: "i", vals: [ ] },
        },
        "@all": {
            debug:   { short: "d", cnt: 0 },
            help:    { short: "h", cnt: 0 },
            quiet:   { short: "q", cnt: 0 },
            verbose: { short: "v", cnt: 0 },
        },
        "@none": {
            help:    { short: "h", cnt: 0 },
        },

    };

    try {
        minicle(optionMap, {subcommand: true});
    } catch(e) {
        error("fatal", "Invalid subcommand.");
    }

    if(optionMap["@all"].help.cnt || optionMap["@none"].help.cnt) {
        outputHeader(version);
        usage();
    }

    if(optionMap["@all"].debug.cnt) {
        verbosity = 4;
    } else if(optionMap["@all"].verbose.cnt) {
        verbosity = optionMap["@all"].verbose.cnt;
    } else if(optionMap["@all"].quiet.cnt) {
        verbosity = 0;
    }

    if(optionMap["@subcommand"] === undefined)
        error("fatal", "No subcommand given.");

    if(verbosity)
        outputHeader(version);

    switch(optionMap["@subcommand"]) {
        case "chain":
            doChain(optionMap.chain);
            break;
        case "grammar":
            doGrammar(optionMap.grammar);
            break;
        case "babble":
            doBabble(optionMap.babble);
            break;
        default:
            error("fatal", "This shouldn't have happened.");
            break;
    }

}


//==============================================================================
// Entry point for grammar execution.
//==============================================================================

function doGrammar(options) {

    error("warn", "doGrammar is under construction.", "doGrammar");

    // Parameter validation ----------------------------------------------------

    var opts = { };   // options for SimpleGrammar constructor

    if(options.grammar.vals.length == 0)
        error("fatal", "No input file(s) specified.", "doGrammar");

    if(options.text.vals.length == 0)
        error("fatal", "No working text template specified.", "doGrammar");

    if(options.tokens.vals.length > 0) {
        let tcnt = parseInt(options.tokens.vals[0]);
        if(isNaN(tcnt) || tcnt < 1)
            error("fatal", "The maximum token count must be a positive integer.", "doGrammar");
        opts.maxTokens = tcnt;
    }

    if(options.iter.vals.length > 0) {
        let iter = parseInt(options.iter.vals[0]);
        if(isNaN(iter) || iter < 1)
            error("fatal", "The maximum iteration count must be a positive integer.", "doGrammar");
        opts.maxIterations = tcnt;
    }

    // Load grammar and working text files -------------------------------------

    var fp = new File(options.text.vals[0], "r");
    if(!fp.open)
        error("fatal", "Unable to open text template file \"" + options.text.vals[0] + "\" for reading.");
    var rawText = fp.read();
    fp.close();

    var sg = Textrix.SimpleGrammar({ text: rawText });
    if(verbosity == 4) {
        error("debug", "sg._text dump follows", "doGrammar");
        dump(sg._text);
    }

    sg.rulesLoad(options.grammar.vals[0]);
    if(verbosity == 4) {
        error("debug", "sg._rules dump follows:", "doGrammar");
        dump(sg._rules);
    }

    // Iterate transformations and output --------------------------------------

    sg.transform();
    console.log(sg.textFinalize());

}

//==============================================================================
// Entry point for chain generation.
//==============================================================================

function doChain(options) {

    // Parameter validation ----------------------------------------------------

    if(options.count.vals.length == 0)
        error("fatal", "No output count specified.", "doChain");

    var chainCount = parseInt(options.count.vals[0]);
    if(isNaN(chainCount) || chainCount < 1)
        error("fatal", "The output chain count must be a positive integer.", "doChain");

    if(options.infile.vals.length == 0)
        error("fatal", "No input file(s) specified.", "doChain");

    if(options.start.vals.length == 0)
        error("fatal", "No start tag specified.", "doChain");
    var start = options.start.vals[0].trim();

    if(options["max-size"].vals.length) {
        var maxSize = parseInt(options["max-size"].vals[0].trim());
        if(isNaN(maxSize) || maxSize < 1)
            error("fatal", "max-size must be a positive integer.", "doChain");
    } else {
        var maxSize = null;
    }

    // Load source file --------------------------------------------------------

    var sources = [ ];
    for(var i = 0; i < options.infile.vals.length; i++) {
        try {
            var fp = new File(options.infile.vals[i], "r");
        } catch(e) {
            error("fatal", "Unable to open input file '" + options.infile.vals[i] + "'.", "doChain");
        }
        if(!fp.open)
            error("fatal", "Unable to open input file '" + options.infile.vals[i] + "'.", "doChain");
        sources.push(fp.read());
        fp.close();
    }
    sources = sources.join("\n").replace(/\n\n+/g, "\n").split(/\n/);
    if(sources.length == 0)
        error("fatal", "No input file contents!", "doChain");

    var chain = Textrix.TagChain();
    chain.start = start;
    if(maxSize != null)
        chain.maxSize = maxSize;

    var links = [ ];
    var regex = /^\s*(\S+):\s+(.*)\s+:(\S+)/;
    for(var i = 0; i < sources.length; i++) {
        if(typeof sources[i] != "string")
            continue;
        sources[i] = sources[i].trim();
        var rr = regex.exec(sources[i]);
        if(rr === null)
            continue;
        try {
            var head = rr[1].trim();
            var body = rr[2].trim();
            var tail = rr[3].trim();
        } catch(e) {
            error("fatal", "Invalid chain input: \"" + rr[0] + "\".", "doChain");
        }
        if(head.length == 0 || tail.length == 0)
            error("fatal", "Missing head/tail in chain definition: \"" + rr[0] + "\".", "doChain");
        try {
            chain.linkAdd(head, body, tail);
        } catch(e) {
            error("fatal", "Invalid link syntax \"" + sources[i] + "\".", "doChain");
        }
    }

    // Generate chains ---------------------------------------------------------

    for(var i = 0; i < chainCount; i++) {
        var item = chain.getChain();
        console.log(item.join(" "));
    }

}


//==============================================================================
// Entry point for quasi-Markov chain generation.
//==============================================================================

function doBabble(options) {
    error("fatal", "doBabble is not implemented yet.", "doBabble");
}


//==============================================================================
// Outputs the runtime header to console. This will become progressively more
// ostentatious and ridiculous as time goes by.
//==============================================================================

function outputHeader(version) {

    console.log(
        "\n" + ac.blue("===========================================================================") + "\n"
        + ac.yellow.bold("          Textrix v" + version + " -- Minimalist Unit/Regression Test Tool") + "\n"
        + ac.blue("===========================================================================") + "\n"
    );

}


//==============================================================================
// Outputs usage instructions.
//==============================================================================

function usage(exit = true) {

    console.log(ac.white.bold("  Usage: textrix <cmd> [options]\n\n")
        + ac.green.bold(" cmd: chain ---------------------------------------------------------------\n\n")
        + ac.yellow.bold("    -i") + ac.yellow(", ") + ac.yellow.bold("--infile        ") + ac.blue.bold("<filename(s)>  ") + ac.cyan.bold("Path to input chain file(s).\n")
        + ac.yellow.bold("    -c") + ac.yellow(", ") + ac.yellow.bold("--count         ") + ac.blue.bold("<number>       ") + ac.cyan.bold("Number of chains to generate.\n")
        + ac.yellow.bold("    -s") + ac.yellow(", ") + ac.yellow.bold("--start         ") + ac.blue.bold("<string>       ") + ac.cyan.bold("Start tag for chain.\n")
        + ac.yellow.bold("    -m") + ac.yellow(", ") + ac.yellow.bold("--max-size      ") + ac.blue.bold("<number>       ") + ac.cyan.bold("Maximum links per chain.\n\n")
        + ac.green.bold(" cmd: grammar -------------------------------------------------------------\n\n")
        + ac.yellow.bold("    -g") + ac.yellow(", ") + ac.yellow.bold("--grammar       ") + ac.blue.bold("<filename(s)>  ") + ac.cyan.bold("Path to grammar file(s).\n")
        + ac.yellow.bold("    -t") + ac.yellow(", ") + ac.yellow.bold("--text          ") + ac.blue.bold("<filename>     ") + ac.cyan.bold("Path to template text.\n")
        + ac.yellow.bold("    -T") + ac.yellow(", ") + ac.yellow.bold("--tokens        ") + ac.blue.bold("<number>       ") + ac.cyan.bold("Maximum number of tokens.\n")
        + ac.yellow.bold("    -i") + ac.yellow(", ") + ac.yellow.bold("--iter          ") + ac.blue.bold("<number>       ") + ac.cyan.bold("Maximum number of iterations.\n\n")
        + ac.green.bold(" cmd: babble --------------------------------------------------------------\n\n")
        + ac.yellow.bold("    -i") + ac.yellow(", ") + ac.yellow.bold("--infile        ") + ac.blue.bold("<filename(s)>  ") + ac.cyan.bold("Path to input file(s).\n\n")
        + ac.green.bold(" General options-----------------------------------------------------------\n\n")
        + ac.yellow.bold("    -v") + ac.yellow(", ") + ac.yellow.bold("--verbose       ") + ac.blue.bold("               ") + ac.cyan.bold("Increase verbosity (1-4).\n")
        + ac.yellow.bold("    -q") + ac.yellow(", ") + ac.yellow.bold("--quiet         ") + ac.blue.bold("               ") + ac.cyan.bold("Suppress console output.\n")
        + ac.yellow.bold("    -d") + ac.yellow(", ") + ac.yellow.bold("--debug         ") + ac.blue.bold("               ") + ac.cyan.bold("Display debugging info.\n")
        + ac.yellow.bold("    -h") + ac.yellow(", ") + ac.yellow.bold("--help          ") + ac.blue.bold("               ") + ac.cyan.bold("Display this text.\n\n"));

    if(exit)
        process.exit(0);
}


//==============================================================================
// Prints an error message to console if permitted by the current verbosity
// level, and if the error is fatal, terminates the process.
//==============================================================================

function error(level, message, location = "TEXTRIX") {

    if(verbosity) {
        switch(level) {
            case "fatal":
                console.log(ac.bgRed.yellowBright("[" + location + "]") + ac.redBright(" FATAL ERROR: ") + ac.yellowBright(message));
                break;
            case "warn":
                if(verbosity >= 1)
                    console.log(ac.bgYellow.whiteBright("[" + location + "]") + ac.yellowBright(" WARNING: ") + message);
                break;
            case "info":
                if(verbosity >= 2)
                    console.log(ac.bgGreen.whiteBright("[" + location + "]") + ac.greenBright(" INFO: ") + message);
                break;
            case "debug":
                if(verbosity >= 3)
                    console.log("[" + location + "] DEBUG: " + message);
                break;
        }
    }

    if(level == "fatal" && verbosity < 2)
        process.exit(1);
}

// DELETE ME -------------------------------------------------------------------

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


/*

TODO:

    * tokenize replacements
    * output file or stdout
    * import stuff from V implementation for babble


*/
