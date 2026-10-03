// Drives the REAL move() + mergeTiles() extracted from 2048.html.
// All free variables are declared in one scope so the extracted functions share
// `tiles` via closure, mirroring the real IIFE.
"use strict";
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "2048.html"), "utf8");
const gameSrc = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1]).pop();

function sliceFn(src, name) {
  const start = src.indexOf("function " + name + "(");
  let i = src.indexOf("{", start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error("unbalanced " + name);
}

const moveSrc = sliceFn(gameSrc, "move");
const mergeSrc = sliceFn(gameSrc, "mergeTiles");

// Build a real game world by eval'ing the two functions plus stubs in one scope.
function world(initial, { disableSpawn } = {}) {
  const SIZE = 4;
  let tiles = initial.map((t, i) => ({ id: i + 1, value: t.value, r: t.r, c: t.c }));
  let score = 0, gameOverShown = false;

  const stubs = `
    var SIZE = ${SIZE};
    var over = false;
    function findTile(r,c){ for(var i=0;i<tiles.length;i++) if(tiles[i].r===r&&tiles[i].c===c) return tiles[i]; return null; }
    function place(){}
    function paint(){}
    function emptyCells(){ var o={}; tiles.forEach(function(t){o[t.r+","+(t.c)]=1;}); var a=[]; for(var r=0;r<SIZE;r++)for(var c=0;c<SIZE;c++)if(!o[r+","+(c)])a.push([r,c]); return a; }
    function spawnRandom(){ ${disableSpawn ? "return;" : `
      var e=emptyCells(); if(!e.length)return; var p=e[(Math.random()*e.length)|0];
      var v=Math.random()<0.9?2:4; var t={id:1e5+(spawned=spawned+1),value:v,r:p[0],c:p[1]}; tiles.push(t);`} }
    var spawned=0;
    function updateScore(){}
    function isGameOver(){ return false; }
    function showOverlay(){ gameOverShown=true; }
  `;

  // Run in a function scope where `tiles`, `score`, `gameOverShown` are real vars.
  const factory = new Function(
    "tiles", "score", "gameOverShown",
    stubs + "\n" + mergeSrc + "\n" + moveSrc +
    "\nreturn { move: move, tiles: tiles, score: score };"
  );
  const g = factory(tiles, score, gameOverShown);
  // mergeTiles reassigns its own `tiles` binding (closure), NOT `g.tiles`.
  // So read live tiles from the closure, not g.tiles. Return a getter:
  g.tiles = function () { return tilesLive; };
  return g;
}

// Problem: mergeTiles does `tiles = tiles.filter(...)`, rebinding the closure var,
// so the outer `tiles`/`g.tiles` reference goes stale. To observe the live array,
// rebuild `world` to expose the same binding. Simplest: have mergeTiles NOT rebind
// by testing the algorithm through a wrapper that reads a shared ref.
// Instead: redefine the test to capture the live tiles via a holder object.

const DIRS = ["left", "right", "up", "down"];
const sum = (ts) => ts.reduce((s, t) => s + t.value, 0);
const SIZE = 4;

function checkCompact(ts, dir) {
  const horiz = dir === "left" || dir === "right", low = dir === "left" || dir === "up";
  for (let line = 0; line < SIZE; line++) {
    const occ = [];
    for (let k = 0; k < SIZE; k++) {
      const r = horiz ? line : k, c = horiz ? k : line;
      if (ts.some((t) => t.r === r && t.c === c)) occ.push(k);
    }
    const n = occ.length;
    for (let i = 0; i < n; i++) if (occ[i] !== (low ? i : SIZE - n + i)) return false;
  }
  return true;
}

// Rebuild world() so the live tiles survive mergeTiles' rebind: pass a holder.
function elStub() {
  const set = new Set();
  return {
    classList: {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c, v) => (v ? set.add(c) : set.delete(c)),
      contains: (c) => set.has(c),
    },
    remove() {},
  };
}

function makeGame(initial, disableSpawn) {
  const SIZE = 4;
  const holder = {
    tiles: initial.map((t, i) => ({ id: i + 1, value: t.value, r: t.r, c: t.c, el: elStub() })),
    score: 0, gameOverShown: false, spawned: 0,
  };
  const stubs = `
    var over = false, won = false;
    function findTile(r,c){ for(var i=0;i<H.tiles.length;i++) if(H.tiles[i].r===r&&H.tiles[i].c===c) return H.tiles[i]; return null; }
    function place(){}
    function paint(){}
    function emptyCells(){ var o={}; H.tiles.forEach(function(t){o[t.r+","+(t.c)]=1;}); var a=[]; for(var r=0;r<SIZE;r++)for(var c=0;c<SIZE;c++)if(!o[r+","+(c)])a.push([r,c]); return a; }
    function spawnRandom(){ ${disableSpawn ? "return;" :
      `var e=emptyCells(); if(!e.length)return; var p=e[(Math.random()*e.length)|0]; var v=Math.random()<0.9?2:4; H.tiles.push({id:1e5+(H.spawned++),value:v,r:p[0],c:p[1]});`} }
    function updateScore(){}
    function isGameOver(){ return false; }
    function showOverlay(){ H.gameOverShown=true; }
  `;
  // Adapt the real source: replace `tiles` -> `H.t`, `score` -> `H.score`.
  const move = new Function("H", "SIZE",
    stubs + "\n" +
    mergeSrc.replace(/\btiles\b/g, "H.tiles").replace(/\bscore\b/g, "H.score") +
    "\n" + moveSrc.replace(/\btiles\b/g, "H.tiles").replace(/\bscore\b/g, "H.score") +
    "\nreturn move;");
  const doMove = move(holder, SIZE);
  return { run: (dir) => doMove(dir), tiles: () => holder.tiles, score: () => holder.score };
}

let fail = 0;
for (let it = 0; it < 50000 && !fail; it++) {
  const cells = [], used = new Set(), count = 2 + (Math.random() * 14 | 0);
  while (cells.length < count) {
    const r = Math.random() * SIZE | 0, c = Math.random() * SIZE | 0;
    if (!used.has(r + "," + c)) { used.add(r + "," + c); cells.push([r, c]); }
  }
  const initial = cells.map(([r, c]) => ({ r, c, value: 2 ** (1 + (Math.random() * 6 | 0)) }));
  const g = makeGame(initial, true); // disable spawn so sum is conserved exactly
  const pre = sum(g.tiles());
  const dir = DIRS[Math.random() * 4 | 0];
  g.run(dir);
  const post = g.tiles();
  const cellOk = new Set(post.map((t) => t.r + "," + t.c)).size === post.length;
  const idOk = new Set(post.map((t) => t.id)).size === post.length;
  const compOk = checkCompact(post, dir);
  const sumOk = sum(post) === pre;
  if (!cellOk) { console.log("CELL COLLISION", dir, JSON.stringify(post)); fail++; break; }
  if (!idOk) { console.log("ID COLLISION"); fail++; break; }
  if (!compOk) { console.log("NOT COMPACT", dir, JSON.stringify(post.map((t) => [t.value, t.r, t.c]))); fail++; break; }
  if (!sumOk) { console.log("SUM CHANGED", pre, "->", sum(post), dir, JSON.stringify(post)); fail++; break; }
}
console.log(fail ? "FUZZ FAILED" : "FUZZ PASSED: 50000 random boards, no cell/id collisions, always compact, value conserved");

// Spot-check known results (spawn disabled)
function spot(values, dir, row = 0) {
  const init = values.map((v, i) => ({ r: row, c: i, value: v }));
  const g = makeGame(init, true);
  g.run(dir);
  return [0, 1, 2, 3].map((c) => { const t = g.tiles().find((x) => x.r === row && x.c === c); return t ? t.value : 0; });
}
console.log("2222 L  =", spot([2, 2, 2, 2], "left"), " expect [4,4,0,0]");
console.log("224  L  =", spot([2, 2, 4], "left"), "  expect [4,4,0,0]");
console.log("422  L  =", spot([4, 2, 2], "left"), "  expect [4,4,0,0]");
console.log("242  L  =", spot([2, 4, 2], "left"), "  expect [2,4,2,0]");
console.log("224  R  =", spot([2, 2, 4], "right"), " expect [0,0,4,4]");
console.log("2424 R  =", spot([2, 4, 2, 4], "right"), " expect [2,4,2,4] (no merge)");
process.exit(fail ? 1 : 0);
