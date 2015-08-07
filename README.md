# JSONPlus
a JSON parser that supports comments and self references

## Usage
It's really simple
```javascript
var parse = require('jsonplus');

// Parse like you would with JSON.parse
var response = parse('{"foo": 5, "bar": "@@self.foo"}');

console.log(response); // { foo: 5, bar: 5 }
```

jsonplus uses `JSON.parse` insternally so there shouldn't be any performance impact. We only go trough json object once to find the `reference` objects and replace them with actual values. it's a minimal impact considering the gained value.

## Self referencing
Self referencing only works on the values at the moment. Values start with `@@self` will be parsed as reference. Think of `@@self` as `this` rest of it is usual object navigation such as `@@self.foo.bar.list[1]`. if self reference cannot be found, it will be replaced with `undefined`

Note: At the moment a value can only contain a single reference.

## Why?
Self referencing and comments in JSON files can be really useful while creating fixtures. I don't expect anyone to use this for production purposes. JSONPlus should help you create simpler fixtures with comments, can be also used for configuration files as well.

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
