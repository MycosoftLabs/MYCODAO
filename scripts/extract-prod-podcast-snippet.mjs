#!/usr/bin/env node
const html = await (await fetch("https://blocks.mycodao.com/blocks/index.html")).text();
const m = html.match(/assets\/(index-[^"']+\.js)/);
const text = await (await fetch(`https://blocks.mycodao.com/blocks/${m[0]}`)).text();
const start = text.indexOf('Episode player');
console.log(text.slice(start, start + 4500));
