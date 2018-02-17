'use strict';

const _ = require('lodash');
const {root, section, option} = require('gemini-configparser');

const ENV_PREFIX = 'hermione_tabs_closer_';
const CLI_PREFIX = '--hermione-tabs-closer-';

const getParser = () => {
    return root(section({
        enabled: option({
            defaultValue: true,
            validate: (v) => {
                if (!_.isBoolean(v)) {
                    throw new Error(`"enabled" option must be boolean, but got ${typeof v}`);
                }
            },
            parseCli: JSON.parse,
            parseEnv: JSON.parse
        }),
        browsers: option({
            defaultValue: /.*/,
            validate: (v) => {
                if (!_.isRegExp(v)) {
                    throw new Error(`"browsers" option must be RegExp, but got ${typeof v}`);
                }
            },
            parseCli: JSON.parse,
            parseEnv: JSON.parse
        })
    }), {envPrefix: ENV_PREFIX, cliPrefix: CLI_PREFIX});
};

module.exports = (options) => {
    const {env, argv} = process;

    return getParser()({options, env, argv});
};
