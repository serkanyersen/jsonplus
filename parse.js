'use strict';

var strip = require('strip-json-comments');
var tag = /^\@(self|ext)[\.\[]/;
var selfTag = /^\@self[\.\[]/;
var fs = require('fs');
var _ = require('lodash');

var jsonPlus = {
    /**
     * Resolves JS array notation in string to actual value
     * @param  {Object} object    Actual Object
     * @param  {string} reference path defined in string
     * @return {any}              matched value or undefined when not found
     */
    resolvePath: function(object, reference) {
        return _.propertyOf(object)(reference);
    },

    /**
     * Simple template tag matcher, finds tags and
     * evalues values
     * @param  {object} object   Object itself to resolve tags agains
     * @param  {string} template String to look for tags
     * @return {string}          Evaluated string
     */
    parseTemplate: function(object, template) {
        var html = template || '';
        return html.replace(/\{\{\s*(.*?)\s*\}\}/gim, function(all, match) {
            return this.resolvePath(object, match.replace(selfTag, '')) || all;
        }.bind(this));
    },

    /**
     * Recursively goes through JSON object and resolves
     * all self references
     * @param  {Object} obj  JSON Object part
     * @param  {Object} self Full object
     */
    resolve: function(obj, self, path) {
        self = self || obj;
        path = path || [];

        // If object go through each value and call self again
        if (_.isPlainObject(obj)) {
            Object.keys(obj).forEach(function(key) {
                this.resolve(obj[key], self, path.concat([key]));
            }.bind(this));
        }

        // if array go through each item and call self
        else if (Array.isArray(obj)) {
            obj.forEach(function(value, index) {
                this.resolve(obj[index], self, path.concat([index]));
            }.bind(this));
        }

        // if string and starts with the reference tag
        // evaluate and return new value
        else if (typeof obj === 'string' && tag.test(obj)) {
            _.set(self, path, this.resolvePath(self, obj.replace(selfTag, '')));
        }

        // if string check for template tags
        else if (typeof obj === 'string') {
            _.set(self, path, this.parseTemplate(self, obj));
        }
    },

    /**
     * Finds all references external JSON objects parses them recursively
     * and references back to given object
     * @param  {Object} obj to check against references
     * @return {Object}     Parsed object
     */
    findExternal: function(obj) {
        if ('@ext' in obj) {
            Object.keys(obj['@ext']).forEach(function(key) {
                var file = obj['@ext'][key];
                var extObj = this.jsonPlusParse(fs.readFileSync(file, 'utf8'));
                obj['@ext'][key] = extObj;
            }.bind(this));
        }
        return obj;
    },

    /**
     * Remove the @external files object
     * @param  {Object} obj JSON Object
     * @return {Object}     JSON Object
     */
    cleanExternal: function(obj) {
        if (obj) {
            delete obj['@ext'];
        }
        return obj;
    },

    /**
     * Parses json string by removing comments and resolving self references
     * @param  {string} data JSON string
     * @return {Object}      parsed JSON Object
     */
    jsonPlusParse: function(data) {
        var obj = JSON.parse(strip(data));
        obj = this.findExternal(obj);
        this.resolve(obj);
        obj = this.cleanExternal(obj);
        return obj;
    },

    /**
     * Resolves already parsed json object
     * @param  {Object} obj  Already parsed object
     * @param  {Object} self [Optional] Object to use as reference
     * @return {Object}      Resolved object
     */
    jsonPlusResolve: function(obj, self){
        obj = this.findExternal(obj);
        this.resolve(obj, self);
        obj = this.cleanExternal(obj);
        return obj;
    }
};

exports.parse = jsonPlus.jsonPlusParse.bind(jsonPlus);
exports.resolve = jsonPlus.jsonPlusResolve.bind(jsonPlus);
