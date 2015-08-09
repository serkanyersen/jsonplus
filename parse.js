'use strict';
// Helper to strip comments
var strip = require('strip-json-comments');
// Tag matcher
var tag = /^\@self[\.\[]/;

/**
 * Check given object is Actual object or not
 * @param  {any}  obj obj to check against
 * @return {Boolean}     true if object is object
 */
function isObject(obj) {
    return obj === Object(obj) && !Array.isArray(obj);
}

/**
 * Resolves JS array notation in string to actual value
 * @param  {Object} object    Actual Object
 * @param  {string} reference path defined in string
 * @return {any}              matched value or undefined when not found
 */
function resolvePath(object, reference) {
    function arrDeref(o, ref) {
        var key = ref.replace(/^['"]|['"\]]+$/g, '');
        return !ref ? o : (o[key]);
    }

    function dotDeref(o, ref) {
        return ref.split('[').reduce(arrDeref, o);
    }

    return !reference ? object : reference.split('.').reduce(dotDeref, object);
}

/**
 * Simple template tag matcher, finds tags and
 * evalues values
 * @param  {object} object   Object itself to resolve tags agains
 * @param  {string} template String to look for tags
 * @return {string}          Evaluated string
 */
function parseTemplate(object, template) {
    var html = template || '';
    return html.replace(/\{\{\s*(.*?)\s*\}\}/gim, function(all, match) {
        return resolvePath(object, match.replace(tag, '')) || all;
    });
}

/**
 * Recursively goes through JSON object and resolves
 * all self references
 * @param  {Object} obj  JSON Object part
 * @param  {Object} self Full object
 * @return {Object}      evaluated JSON Object part
 */
function selfRef(obj, self) {
    var newObj;
    self = self || obj;

    // If object go through each value and call self again
    if (isObject(obj)) {
        newObj = {};
        Object.keys(obj).forEach(function(key) {
            newObj[key] = selfRef(obj[key], self);
        });
    }

    // if array go through each item and call self
    else if (Array.isArray(obj)) {
        newObj = obj.map(function(val) {
            return selfRef(val, self);
        });
    }

    // if string and starts with the refrence tag
    // evaluate and return new value
    else if (typeof obj === 'string' && tag.test(obj)) {
        newObj = resolvePath(self, obj.replace(tag, ''));
    }

    // if string check for template tags
    else if (typeof obj === 'string') {
        newObj = parseTemplate(self, obj);
    }

    // anything else
    else {
        newObj = obj;
    }

    // yes
    return newObj;
}

/**
 * Parses json string by removing comments and resolving self references
 * @param  {string} data JSON string
 * @return {Object}      parsed JSON Object
 */
exports.parse = function jsonPlusParse(data) {
    var obj = JSON.parse(strip(data));
    obj = selfRef(obj);
    return obj;
};
