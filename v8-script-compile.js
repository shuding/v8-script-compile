"use strict";

const Module = require("module");
const path = require("path");
const vm = require("vm");

function moduleCompile(filename, content) {
  // https://github.com/nodejs/node/blob/v7.5.0/lib/module.js#L511

  // Remove shebang
  var contLen = content.length;
  if (contLen >= 2) {
    if (
      content.charCodeAt(0) === 35 /*#*/ &&
      content.charCodeAt(1) === 33 /*!*/
    ) {
      if (contLen === 2) {
        // Exact match
        content = "";
      } else {
        // Find end of shebang line and slice it off
        var i = 2;
        for (; i < contLen; ++i) {
          var code = content.charCodeAt(i);
          if (code === 10 /*\n*/ || code === 13 /*\r*/) break;
        }
        if (i === contLen) {
          content = "";
        } else {
          // Note that this actually includes the newline character(s) in the
          // new output. This duplicates the behavior of the regular
          // expression that was previously used to replace the shebang line
          content = content.slice(i);
        }
      }
    }
  }

  // create wrapper function
  var wrapper = Module.wrap(content);

  var script = new vm.Script(wrapper, {
    filename: filename,
  });

  return script.runInThisContext({});
}

const originalCompile = Module.prototype._compile;
function install() {
  const hasRequireResolvePaths = typeof require.resolve.paths === "function";
  Module.prototype._compile = function (content, filename) {
    // A quick hack to work around https://github.com/zertosh/v8-compile-cache/issues/30.
    if (content.includes("import")) {
      return originalCompile.call(this, content, filename);
    }

    const mod = this;

    function require(id) {
      return mod.require(id);
    }

    // https://github.com/nodejs/node/blob/v10.15.3/lib/internal/modules/cjs/helpers.js#L28
    function resolve(request, options) {
      return Module._resolveFilename(request, mod, false, options);
    }
    require.resolve = resolve;

    // https://github.com/nodejs/node/blob/v10.15.3/lib/internal/modules/cjs/helpers.js#L37
    // resolve.resolve.paths was added in v8.9.0
    if (hasRequireResolvePaths) {
      resolve.paths = function paths(request) {
        return Module._resolveLookupPaths(request, mod, true);
      };
    }

    require.main = process.mainModule;

    // Enable support to add extra extension types
    // require.extensions = Module._extensions;
    require.cache = Module._cache;

    const dirname = path.dirname(filename);

    const compiledWrapper = moduleCompile(filename, content);

    // We skip the debugger setup because by the time we run, node has already
    // done that itself.

    // `Buffer` is included for Electron.
    // See https://github.com/zertosh/v8-compile-cache/pull/10#issuecomment-518042543
    const args = [
      mod.exports,
      require,
      mod,
      filename,
      dirname,
      process,
      global,
      Buffer,
    ];
    return compiledWrapper.apply(mod.exports, args);
  };
}

install();
