# v8-script-compile

As of today, `vm.compileFunction` is very slow comparing to `vm.Script`: https://github.com/nodejs/node/issues/35375. This module is a require hook that uses v8’s `new vm.Script` as a replacement of Node.js’ default `vm.compileFunction`-based module compilation.

## Usage

Simply require it at the top of your entry file:

```js
import "v8-script-compile";
```

## Acknowledgements

- This package is a fork of the https://github.com/zertosh/v8-compile-cache project.
