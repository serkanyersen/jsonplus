'use strict';
var parse = require('../parse'),
    fs = require('fs');

function fixture(name) {
    return fs.readFileSync('tests/fixtures/' + name + '.json', 'utf8');
}


exports.testSimpleSelfReference = function(test) {
    var json = fixture('simple-self-reference'),
        result = parse(json);

    test.equal(result.bar, 5, 'bar should be equal to foo');
    test.done();
};

exports.testSimpleComments = function(test) {
    var json = fixture('simple-comments-test'),
        result = parse(json);

    test.equal(result.bar, 5, 'bar should be equal to foo');
    test.equal(result.list[0], 5, 'list.0 should be equal to foo');
    test.done();
};
