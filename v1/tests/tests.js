'use strict';
const parse = require('../parse').parse;
const fs = require('fs');

function fixture (name) {
  return fs.readFileSync('tests/fixtures/' + name + '.json', 'utf8');
}

exports.Basic = {
  testSimpleSelfReference: function (test) {
    const result = parse(fixture('simple-self-reference'));

    test.equal(result.bar, 5, 'bar should be equal to foo');
    test.done();
  },

  testComments: function (test) {
    const result = parse(fixture('comments'));

    test.equal(result.bar, 5, 'bar should be equal to foo');
    test.equal(result.list[0], 5, 'list.0 should be equal to foo');
    test.done();
  },
};

exports.Templates = {
  testTemplates: function (test) {
    const result = parse(fixture('template-tags'));

    test.equal(result.full, 'john doe', 'should create full name');
    test.done();
  },

  testTemplatesWithoutPrefix: function (test) {
    const result = parse(fixture('template-tags'));

    test.equal(result.short, 'john doe', 'should create full name');
    test.equal(result.detailed, 'hello world', 'should create sentence');
    test.done();
  },

  testTemplatesWithoutPrefixArray: function (test) {
    const result = parse(fixture('template-tags2'));

    test.equal(result[0].full, 'john doe', 'should create full name');
    test.done();
  },
};

exports.ExternalFiles = {
  testSimpleExternalFile: function (test) {
    const result = parse(fixture('external-file'));

    test.equal(result.name, 'john');
    test.equal(result['@ext'], undefined);
    test.done();
  },

  testDeepExternalFile: function (test) {
    const result = parse(fixture('external-file2'));

    test.equal(result.name, 'john');
    test.equal(result['@ext'], undefined);
    test.done();
  },

  testExtWrongPath: function (test) {
    test.expect(1);
    try {
      parse(fixture('external-file-wrong-path'));
    } catch (e) {
      test.ok(true);
    }
    test.done();
  },

  testExternalFileComplex: function (test) {
    const result = parse(fixture('external-file-complex'));
    test.equal(result.read1, 'john doe');
    test.equal(result.read2, 'hello world');
    test.equal(result.read3, 'yes');
    test.done();
  },
};

exports.Complex = {
  testFirstLevelArray: function (test) {
    const result = parse(fixture('first-level-array'));

    test.equal(result[0].full, 'john doe', 'should create full name');
    test.equal(result[0].self, 'john', 'should get first name');
    test.done();
  },

  testFirstLevelArrayTemplates: function (test) {
    const result = parse(fixture('first-level-array-templates'));

    test.equal(result[1].fullName, 'Mr. john doe', 'should get first name');
    test.done();
  },

  testNotFoundTags: function (test) {
    const result = parse(fixture('not-found'));
    test.equal(result.tag, '{{ blah }}');
    test.done();
  },

  testNotFoundReference: function (test) {
    const result = parse(fixture('not-found'));
    test.equal(result.self, undefined);
    test.done();
  },

  testComplexTags: function (test) {
    const result = parse(fixture('complex-tags'));
    test.equal(result.nospaces, 'john');
    test.equal(result.spaces, 'john');
    test.equal(result.spacesontheside, 'john');
    test.equal(result.nonkey, 'api');
    test.equal(result.hard, 'meh');
    test.equal(result.fullkeys, 'john');
    test.done();
  },

  testDeepLink: function (test) {
    const result = parse(fixture('deep-link'));
    test.equal(result.andthis.will[0].find.that[0][0][0].link, 'yes');
    test.done();
  },

  testRefORef: function (test) {
    const result = parse(fixture('reference-to-reference'));
    test.equal(result.myUsers, 'jane');
    test.equal(result.extUser, 'john');
    test.done();
  },

  testFullExample: function (test) {
    const result = parse(fixture('all-out'));
    test.equal(result[0].read1, 'simple');
    test.equal(result[0].read2, 'myapi');
    test.deepEqual(result[0].read3, { 'first': 'john' });
    // tags
    test.equal(result[0].read4, 'simple');
    test.equal(result[0].read5, 'myapi');
    test.equal(result[0].read6, '[object Object]');
    test.done();
  },
};
