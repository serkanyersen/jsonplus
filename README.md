# JSONPlus
a JSON parser that supports comments and self references

[![Build Status](https://travis-ci.org/serkanyersen/jsonplus.svg?branch=master)](https://travis-ci.org/serkanyersen/jsonplus) [![npm](https://img.shields.io/npm/v/jsonplus.svg)](https://www.npmjs.com/package/jsonplus) [![License](https://img.shields.io/npm/l/jsonplus.svg)](https://github.com/serkanyersen/jsonplus#mit-license)
[![TypeScript definitions on DefinitelyTyped](http://definitelytyped.org/badges/standard-flat.svg)](https://github.com/serkanyersen/jsonplus/blob/master/jsonplus.d.ts)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fserkanyersen%2Fjsonplus.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fserkanyersen%2Fjsonplus?ref=badge_shield)

## Usage
Install using npm
```
npm install --save-dev jsonplus
```

It's really simple
```javascript
var jsonplus = require('jsonplus');

// Parse like you would with JSON.parse
var response = jsonplus.parse('{"foo": 5, "bar": "@self.foo"}');

console.log(response); // { foo: 5, bar: 5 }
```

jsonplus uses `JSON.parse` internally so there shouldn't be any performance impact. We only go through JSON object once to find the `reference` strings and replace them with actual values. The impact is minimal considering the gained value.

## Self referencing
Self referencing only works on values at the moment. Values start with `@self` will be parsed as a reference. Think of `@self` as `this`; the rest of it is usual object navigation such as `@self.foo.bar.list[1]`. If a self reference cannot be found, it will be replaced with `undefined`

## Template tags
You can also use template tags in the values, this is the same thing as self referencing but you can use multiple references in the same value. One of the advantages of having template tags is you can simply omit the `@self` prefix all together -- or keep using it it's up to you :)

Example:
```JSON
{
  "first": "john",
  "last": "doe",
  "full": "{{ first }} {{ last }}"
}
```
If your JSON is a first level array you can use paths like this `{{ [0].first }}` or if you think it's more readable, `{{ @self[0].first }}` works as well.

**Note:** Due to the nature of template tags, everything that passes through them will be converted to string, whereas `@self` notation can replace itself with whatever it is referencing.

## External File References
You can also make references to external files. JSONPlus will fetch those files and allow you to share values between json files.

```javascript
{
  // @ext means external
  "@ext": {
    // Value of `users` will be replaced with the contents of users.json
    "users": "/path/to/users.json"
  },
  // Reach the values of external file using @ext prefix
  "name": "@ext.users[1].name"
}
```

**Notes on external files**:
 - External references can only work on direct objects. json strings that starts with an array ie,`[{ "my": "json" }]` cannot reference to external files.
 - File paths are relative to where your script is running, *not* to the JSON file.
 - If you reference a file that references to your file back, you'll end up in infinite loop.

## Resolve function
Additionally, you can use the reference resolver directly. You might be parsing your JSON files with your own system i.e. streaming and you might only want to have the reference resolver. Here is an example

```javascript
var resolve = require('jsonplus').resolve

// This will resolve all reference strings on the given object
var object = resolve(AlreadyParsedJSON);

// resolve has a second argument, which provides the context for references
var object = resolve({ full: '{{ first }} {{ last }}' }, { first: 'john', last: 'doe' });

console.log(object) // { full: 'john doe' }
```

## A complex example
```javascript
{
  // Get all users
  "/api/users": {
    // Mock response
    "response": {
      "users": [{
        "name": "john doe"
      }, {
        "name": "jane doe"
      }]
    }
  },

  // Get individual user
  "/api/user/1": {
    // Get already defined user from users mock
    "response": "@self['/api/users'].response.users[0]"
  },

  // Get individual user
  "/api/user/2": {
    // Get already defined user from users mock
    "response": "@self['/api/users'].response.users[1]"
  }
}
```
It's quite self explanatory. As you can see it makes things a lot more clearer and shorter.

## Why?
Self referencing and comments in JSON files can be really useful while creating fixture files. I don't expect anyone to use this for production purposes. JSONPlus should help you create simpler fixtures with comments and can be also used for configuration files.

## MIT License
```
Copyright (c) 2015 Serkan Yersen

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fserkanyersen%2Fjsonplus.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fserkanyersen%2Fjsonplus?ref=badge_large)