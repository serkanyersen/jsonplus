'use strict';
var parse = require('../parse').parse,
    fs = require('fs');

function fixture(name) {
    return fs.readFileSync('tests/fixtures/' + name + '.json', 'utf8');
}


exports.Basic = {
    testSimpleSelfReference: function(test) {
        var result = parse(fixture('simple-self-reference'));

        test.equal(result.bar, 5, 'bar should be equal to foo');
        test.done();
    },

    testComments: function(test) {
        var result = parse(fixture('comments'));

        test.equal(result.bar, 5, 'bar should be equal to foo');
        test.equal(result.list[0], 5, 'list.0 should be equal to foo');
        test.done();
    }
};

exports.Templates = {
    testTemplates: function(test) {
        var result = parse(fixture('template-tags'));

        test.equal(result.full, 'john doe', 'should create full name');
        test.done();
    },

    testTemplatesWithoutPrefix: function(test) {
        var result = parse(fixture('template-tags'));

        test.equal(result.short, 'john doe', 'should create full name');
        test.equal(result.detailed, 'hello world', 'should create sentence');
        test.done();
    },

    testTemplatesWithoutPrefixArray: function(test) {
        var result = parse(fixture('template-tags2'));

        test.equal(result[0].full, 'john doe', 'should create full name');
        test.done();
    }
};

exports.ExternalFiles = {
    testSimpleExternalFile: function(test) {
        var result = parse(fixture('external-file'));

        test.equal(result.name, 'john');
        test.equal(result['@ext'], undefined);
        test.done();
    }
};


exports.Complex = {
    testFirstLevelArray: function(test) {
        var result = parse(fixture('first-level-array'));

        test.equal(result[0].full, 'john doe', 'should create full name');
        test.equal(result[0].self, 'john', 'should get first name');
        test.done();
    },

    testFirstLevelArrayTemplates: function(test) {
        var result = parse(fixture('first-level-array-templates'));

        test.equal(result[1].fullName, 'Mr. john doe', 'should get first name');
        test.done();
    },

    testNotFoundTags: function(test) {
        var result = parse(fixture('not-found'));
        test.equal(result.tag, '{{ blah }}');
        test.done();
    },

    testNotFoundReference: function(test) {
        var result = parse(fixture('not-found'));
        test.equal(result.self, undefined);
        test.done();
    },

    testComplexTags: function(test) {
        var result = parse(fixture('complex-tags'));
        test.equal(result.nospaces, 'john');
        test.equal(result.spaces, 'john');
        test.equal(result.spacesontheside, 'john');
        test.equal(result.nonkey, 'api');
        test.equal(result.hard, 'meh');
        test.equal(result.fullkeys, 'john');
        test.done();
    },

    testDeepLink: function(test) {
        var result = parse(fixture('deep-link'));
        test.equal(result.andthis.will[0].find.that[0][0][0].link, 'yes');
        test.done();
    },

    testFullExample: function(test) {
        var result = parse(fixture('all-out'));
        test.equal(result[0].read1, 'simple');
        test.equal(result[0].read2, 'myapi');
        test.deepEqual(result[0].read3, { 'first': 'john' });
        // tags
        test.equal(result[0].read4, 'simple');
        test.equal(result[0].read5, 'myapi');
        test.equal(result[0].read6, '[object Object]');
        test.done();
    }
};

