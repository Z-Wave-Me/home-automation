var request = require("request");
var should = require("should");
var assert = require("assert");

// HACK: router.js needs this to work :(
var _ = require("underscore");
module.exports = {
  '_': _
};

var Router = require("../router");

describe("Router", function () {
  it("supports proper namespacing", function () {
    var handler = function() {},
        router,
        matched;

    router = new Router("/v1"),
    router.addRoute("GET", "/foo/bar", handler);
    matched = router.dispatch("GET", "/v1/foo/bar");
    assert.equal(matched.handler, handler);

    router = new Router("/v3");
    router.addRoute("GET", "/foo/bar", handler);
    matched = router.dispatch("GET", "/v3/foo/bar");
    assert.equal(matched.handler, handler);
  });

  it("supports simple paths", function () {
    var handler1 = function() {},
        handler2 = function() {},
        handler3 = function() {},
        router,
        matched;

    router = new Router("/v1"),
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
    var handler1 = function() {},
        handler2 = function() {},
        handler3 = function() {},
        router,
        matched;

    router = new Router("/v1"),
    router.addRoute("GET", "/foo/:bar", handler1);
    router.addRoute("GET", "/:foo/bar", handler2);
    router.addRoute("PUT", "/:foo/bar/:baz", handler3);

    matched = router.dispatch("GET", "/v1/");
    assert.equal(matched, undefined);

    matched = router.dispatch("GET", "/v1/foo/abcde");
    assert.equal(matched.handler, handler1);
    assert.deepEqual(matched.params, ["abcde"]);

    matched = router.dispatch("GET", "/v1/whoaman/bar");
    assert.equal(matched.handler, handler2);
    assert.deepEqual(matched.params, ["whoaman"]);

    matched = router.dispatch("PUT", "/v1/first_param/bar/second_param");
    assert.equal(matched.handler, handler3);
    assert.deepEqual(matched.params, ["first_param", "second_param"]);
  });
});

