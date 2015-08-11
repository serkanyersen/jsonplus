'use strict';

var strip = require('strip-json-comments');
var tag = /^\@(self|ext)[\.\[]/;
var selfTag = /^\@self[\.\[]/;
var fs = require('fs');
var jsonPlus = {
    /**
     * Check given object is Actual object or not
     * @param  {any}  obj obj to check against
     * @return {Boolean}     true if object is object
     */
    isObject: function(obj) {
        return obj === Object(obj) && !Array.isArray(obj);
    },

    /**
     * Resolves JS array notation in string to actual value
     * @param  {Object} object    Actual Object
     * @param  {string} reference path defined in string
     * @return {any}              matched value or undefined when not found
     */
    resolvePath: function(object, reference) {

        function arrDeref(o, ref) {
            var key = ref.replace(/^['"]|['"\]]+$/g, '');
            return !ref ? o : (o[key]);
        }

        function dotDeref(o, ref) {
            return ref.split('[').reduce(arrDeref, o);
        }

        return !reference ? object : reference.split('.').reduce(dotDeref, object);
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
     * @return {Object}      evaluated JSON Object part
     */
    resolve: function(obj, self) {
        var newObj;
        self = self || obj;

        // If object go through each value and call self again
        if (this.isObject(obj)) {
            newObj = {};
            Object.keys(obj).forEach(function(key) {
                newObj[key] = this.resolve(obj[key], self);
            }.bind(this));
        }

        // if array go through each item and call self
        else if (Array.isArray(obj)) {
            newObj = obj.map(function(val) {
                return this.resolve(val, self);
            }.bind(this));
        }

        // if string and starts with the reference tag
        // evaluate and return new value
        else if (typeof obj === 'string' && tag.test(obj)) {
            newObj = this.resolvePath(self, obj.replace(selfTag, ''));
        }

        // if string check for template tags
        else if (typeof obj === 'string') {
            newObj = this.parseTemplate(self, obj);
        }

        // anything else
        else {
            newObj = obj;
        }

        // yes
        return newObj;
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
        obj = this.resolve(obj);
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
        obj = this.resolve(obj, self);
        obj = this.cleanExternal(obj);
        return obj;
    }
};

exports.parse = jsonPlus.jsonPlusParse.bind(jsonPlus);
exports.resolve = jsonPlus.jsonPlusResolve.bind(jsonPlus);
