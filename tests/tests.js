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

exports.testComments = function(test) {
    var json = fixture('comments'),
        result = parse(json);

    test.equal(result.bar, 5, 'bar should be equal to foo');
    test.equal(result.list[0], 5, 'list.0 should be equal to foo');
    test.done();
};

exports.testTemplates = function(test) {
    var json = fixture('template-tags'),
        result = parse(json);

    test.equal(result.full, 'john doe', 'should create full name');
    test.done();
};

exports.testTemplatesWithoutPrefix = function(test) {
    var json = fixture('template-tags'),
        result = parse(json);

    test.equal(result.short, 'john doe', 'should create full name');
    test.equal(result.detailed, 'hello world', 'should create sentence');
    test.done();
};

exports.testTemplatesWithoutPrefixArray = function(test) {
    var json = fixture('template-tags2'),
        result = parse(json);

    test.equal(result[0].full, 'john doe', 'should create full name');
    test.done();
};

