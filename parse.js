'use strict';
var strip = require('strip-json-comments');
var tag = /^\@self[\.\[]/;

function isObject(obj) {
    return obj === Object(obj) && !Array.isArray(obj);
}

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

function parseTemplate(object, template) {
    var html = template || '';
    return html.replace(/\{\{\s*(.*?)\s*\}\}/gim, function(all, match) {
        return resolvePath(object, match.replace(tag, '')) || all;
    });
}

function selfRef(obj, self) {
    var newObj;
    self = self || obj;

    if (isObject(obj)) {
        newObj = {};
        Object.keys(obj).forEach(function(key) {
            newObj[key] = selfRef(obj[key], self);
        });
    } else if (Array.isArray(obj)) {
        newObj = obj.map(function(val) {
            return selfRef(val, self);
        });
    } else if (typeof obj === 'string' && tag.test(obj)) {
        newObj = resolvePath(self, obj.replace(tag, ''));
    } else if (typeof obj === 'string') {
        newObj = parseTemplate(self, obj);
    } else {
        newObj = obj;
    }
    return newObj;
}

module.exports = function jsonPlusParse(data) {
    var obj = JSON.parse(strip(data));
    obj = selfRef(obj);
    return obj;
};
