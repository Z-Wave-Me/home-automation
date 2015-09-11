'use strict';
var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore");

module.exports = {
  '_': _
};

var Router = require("../../router");

describe("Router", function () {
  it("supports proper namespacing", function () {
    var handler = function () {},
        router,
        matched;

    router = new Router("/v1");
    router.addRoute("GET", "/foo/bar", handler);
    matched = router.dispatch("GET", "/v1/foo/bar");
    assert.equal(matched.handler, handler);

    router = new Router("/v3");
    router.addRoute("GET", "/foo/bar", handler);
    matched = router.dispatch("GET", "/v3/foo/bar");
    assert.equal(matched.handler, handler);
  });

  it("supports simple paths", function () {
    var handler1 = function () {},
        handler2 = function () {},
        handler3 = function () {},
        router,
        matched;

    router = new Router("/v1");
    router.addRoute("GET", "/", handler1);
    router.addRoute("GET", "/foo/bar", handler2);
    router.addRoute("PUT", "/foo/bar/baz", handler3);

    matched = router.dispatch("GET", "/v1/");
    assert.equal(matched.handler, handler1);

    matched = router.dispatch("GET", "/v1/foo/bar");
    assert.equal(matched.handler, handler2);

    matched = router.dispatch("GET", "/v1/foo/bar/baz");
    assert.equal(matched, undefined);

    matched = router.dispatch("PUT", "/v1/foo/bar/baz");
    assert.equal(matched.handler, handler3);
  });

  it("supports patterned paths", function () {
    var handler1 = function () {
            console.log('1');
        },
        handler2 = function () {
            console.log('2');
        },
        handler3 = function () {
            console.log('3');
        },
        handler4 = function () {
            console.log('4');
        },
        handler5 = function () {
            console.log('5');
        },
        handler6 = function () {
            console.log('6');
        },
        router,
        matched;

    router = new Router("/v1");
    router.addRoute("GET", "/foo/:bar", handler1);
    router.addRoute("GET", "/:foo/bar", handler2);
    router.addRoute("GET", "/far/:baz", handler3);
    router.addRoute("DELETE", "/far/:baz", handler4);
    router.addRoute("POST", "/far/:baz", handler5);
    router.addRoute("PUT", "/far/:baz", handler6);

    matched = router.dispatch("GET", "/v1/");
    assert.equal(matched, undefined);

    matched = router.dispatch("GET", "/v1/foo/abcde");
    assert.equal(matched.handler, handler1);
    assert.deepEqual(matched.params, ["abcde"]);

    matched = router.dispatch("GET", "/v1/whoaman/bar");
    assert.equal(matched.handler, handler2);
    assert.deepEqual(matched.params, ["whoaman"]);

    matched = router.dispatch("GET", "/v1/far/second_param");
    assert.equal(matched.handler, handler3);
    assert.deepEqual(matched.params, ["second_param"]);
    matched = router.dispatch("DELETE", "/v1/far/second_param");
    assert.equal(matched.handler, handler4);
    assert.deepEqual(matched.params, ["second_param"]);
    matched = router.dispatch("POST", "/v1/far/second_param");
    assert.equal(matched.handler, handler5);
    assert.deepEqual(matched.params, ["second_param"]);
    matched = router.dispatch("PUT", "/v1/far/second_param");
    assert.equal(matched.handler, handler6);
    assert.deepEqual(matched.params, ["second_param"]);
  });

  it("supports patterned paths with preprocessors", function () {
    var handler1 = function () {
            console.log('1');
        },
        handler2 = function () {
            console.log('2');
        },
        router,
        matched;

    router = new Router("/v1");
    router.addRoute("GET", "/foo/:bar/:baz", handler1, [parseInt]);
    router.addRoute("GET", "/fob/:foo/:bar", handler2, [null, parseInt]);

    matched = router.dispatch("GET", "/v1/foo/12/123");
    assert.equal(matched.handler, handler1);
    assert.strictEqual(matched.params[0], 12);
    assert.strictEqual(matched.params[1], "123");

    matched = router.dispatch("GET", "/v1/fob/12/123");
    assert.equal(matched.handler, handler2);
    assert.strictEqual(matched.params[0], "12");
    assert.strictEqual(matched.params[1], 123);
  });
});