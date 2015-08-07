'use strict';

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


function selfRef(obj, self) {
    var newObj;
    var tag = /^\@\@self[\.\[]/;
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
    } else {
        newObj = obj;
    }
    return newObj;
}

module.exports = function jsonPlusParse(data) {
    var obj = JSON.parse(data);
    obj = selfRef(obj);
    return obj;
};
