const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../../ui/app.js"), "utf8");
const syncSource = source.slice(source.indexOf("function syncBossExcludeRows("), source.indexOf("function renderBossRunQueueExcludeList("));

function createHarness() {
  let created = 0;
  let mutations = 0;
  const bound = [];
  class Node {
    constructor(html = "") {
      this.html = html;
      this.dataset = {};
      this.children = [];
      this.parent = null;
    }
    get firstElementChild() { return this.children[0] || null; }
    get nextElementSibling() {
      return this.parent?.children[this.parent.children.indexOf(this) + 1] || null;
    }
    contains(active) { return active === this || active?.owner === this; }
    insertBefore(node, cursor) {
      if (node.parent) node.remove();
      const index = cursor ? this.children.indexOf(cursor) : this.children.length;
      assert.ok(index >= 0, "cursor must belong to the list");
      this.children.splice(index, 0, node);
      node.parent = this;
      mutations += 1;
    }
    replaceWith(node) {
      const parent = this.parent;
      parent.children[parent.children.indexOf(this)] = node;
      node.parent = parent;
      this.parent = null;
      mutations += 1;
    }
    remove() {
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
      mutations += 1;
    }
  }
  const document = {
    activeElement: null,
    createElement(tag) {
      assert.equal(tag, "template");
      return {
        content: {},
        set innerHTML(html) {
          created += 1;
          this.content.firstElementChild = new Node(html);
        },
      };
    },
  };
  const context = { document, bindBossAvatarFallbacks(node) { bound.push(node); } };
  vm.runInNewContext(syncSource, context);
  const list = new Node();
  return {
    list, document, bound,
    sync: (rows) => context.syncBossExcludeRows(list, rows),
    counts: () => ({ created, mutations }),
  };
}

const rows = Array.from({ length: 100 }, (_, index) => ({ key: `boss:${index}`, html: `<div>Boss ${index}</div>` }));

test("reopening and unchanged polling preserve all participant nodes without DOM writes", () => {
  const h = createHarness();
  h.sync(rows);
  const nodes = [...h.list.children];
  const counts = h.counts();
  for (let i = 0; i < 10; i += 1) h.sync(rows);
  assert.deepEqual(h.counts(), counts);
  assert.deepEqual(h.list.children, nodes);
  assert.equal(h.bound.length, 100);
});

test("a status update replaces only the changed boss row", () => {
  const h = createHarness();
  h.sync(rows);
  const nodes = [...h.list.children];
  h.sync(rows.map((row, index) => index === 50 ? { ...row, html: "<div>Available</div>" } : row));
  assert.equal(h.counts().created, 101);
  assert.notEqual(h.list.children[50], nodes[50]);
  for (let i = 0; i < rows.length; i += 1) {
    if (i !== 50) assert.equal(h.list.children[i], nodes[i]);
  }
});

test("polling leaves a focused boss control intact and applies changes after focus leaves", () => {
  const h = createHarness();
  h.sync(rows.slice(0, 2));
  const node = h.list.children[0];
  h.document.activeElement = { owner: node };
  const updated = [{ ...rows[0], html: "<div>Updated rules</div>" }, rows[1]];
  h.sync(updated);
  assert.equal(h.list.children[0], node);
  assert.equal(h.counts().created, 2);
  h.document.activeElement = null;
  h.sync(updated);
  assert.notEqual(h.list.children[0], node);
  assert.equal(h.counts().created, 3);
});

test("filtering, reordering, and restoring participants retain the correct rows", () => {
  const h = createHarness();
  h.sync(rows.slice(0, 4));
  const nodes = [...h.list.children];
  h.sync([rows[3], rows[1]]);
  assert.deepEqual(h.list.children, [nodes[3], nodes[1]]);
  assert.equal(h.counts().created, 4);
  h.sync([{ key: "empty", html: "<div>No matches</div>" }]);
  assert.equal(h.list.children.length, 1);
  assert.equal(h.list.children[0].dataset.bossExcludeKey, "empty");
  h.sync(rows.slice(0, 4));
  assert.deepEqual(h.list.children.map((node) => node.dataset.bossExcludeKey), rows.slice(0, 4).map((row) => row.key));
});
