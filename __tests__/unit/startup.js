global._ = require('../../lib/underscore');

// initialize core
require('../../core/core');
require('../../core/core.helpers');
require('../../core/core.base');
require('../../core/core.namespace');
require('../../core/core.storage');
require('../../core/core.model');
require('../../core/core.collection');
require('../../core/core.router');

module.exports = global.Core;