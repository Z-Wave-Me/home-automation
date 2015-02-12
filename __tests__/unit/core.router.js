'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Router', function () {
    var router;

    it('start router', function (done) {
        var author = null,
            books = null,
            event = null;

        router = new Core.Router({
            '/author': function () {
                author = 'Nick Fury';
            },
            '/books': function () {
                books = [{id: 1}, {id: 2}];
            },
            '/books/view/:bookId/users/:userId': function (eventObject) {
                event = eventObject;
            }
        });

        router.dispatch({
            url: 'http://example.com/author',
            method: 'GET',
            query: {},
            body: {},
            header: {}
        });
        router.dispatch({
            url: 'http://example.com/books',
            method: 'GET',
            query: {},
            body: {},
            header: {}
        });
        router.dispatch({
            url: 'http://example.com/books/view/123/users/234',
            method: 'GET',
            query: {},
            body: {},
            header: {}
        });

        // tests
        expect(router).to.be.instanceof(Core.Base);
        expect(author).to.equal('Nick Fury');
        expect(books).to.deep.equal([{id: 1}, {id: 2}]);
        expect(event).to.be.an('object');
        expect(event).to.deep.equal({
            method: 'GET',
            params: ['123', '234'],
            req: {
                url: 'http://example.com/books/view/123/users/234',
                method: 'GET',
                query: {},
                body: {},
                header: {},
                path: '/books/view/123/users/234'
            }
        });

        done();
    });
});