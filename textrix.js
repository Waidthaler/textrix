#!/usr/bin/env node

const Textrix = require("./textrix.lib.js");

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
