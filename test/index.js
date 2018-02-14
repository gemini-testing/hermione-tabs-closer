'use strict';

const plugin = require('../');
const EventEmitter = require('events');

const events = {AFTER_FILE_READ: 'after_file_read'};

describe('hermione tabs closer', () => {
    const sandbox = sinon.sandbox.create();

    const mkHermioneStub = (config) => {
        const hermione = new EventEmitter();

        hermione.events = events;
        hermione.config = config || {forBrowser: () => ({testsPerSession: 10})};

        return hermione;
    };

    const mkBrowser = () => {
        return {
            switchTab: sandbox.stub().resolves(),
            getTabIds: sandbox.stub().resolves(['tab1', 'tab2', 'tab3']),
            close: sandbox.stub().resolves()
        };
    };

    it('should close all opened tabs except last tab', () => {
        let cb;
        const data = {
            suite: {
                beforeEach: (fn) => {
                    cb = fn;
                    return fn.bind({browser: {}});
                }
            }
        };
        const hermione = mkHermioneStub();

        plugin(hermione);
        hermione.emit(events.AFTER_FILE_READ, data);
        const browser = mkBrowser();

        return cb.call({browser})
            .then(() => {
                assert.calledWith(browser.switchTab, 'tab1');
                assert.calledWith(browser.close, 'tab2');
                assert.calledWith(browser.close, 'tab3');
                assert.neverCalledWith(browser.close, 'tab1');
            });
    });

    it('should not close tabs for browsers which not match to RegExp', () => {
        let cb;
        const data = {
            suite: {
                beforeEach: (fn) => {
                    cb = fn;
                    return fn.bind({browser: {}});
                }
            },
            browser: 'bro1'
        };
        const hermione = mkHermioneStub();

        plugin(hermione, {browsers: /bro2/});
        hermione.emit(events.AFTER_FILE_READ, data);

        const getTabIds = sandbox.stub();
        const browser = Promise.resolve({getTabIds});

        return cb.call({browser})
            .then(() => assert.notCalled(getTabIds));
    });

    it('should not close tabs for browsers with one test per session', () => {
        let cb;
        const data = {
            suite: {
                beforeEach: (fn) => {
                    cb = fn;
                    return fn.bind({browser: {}});
                }
            },
            browser: 'bro1'
        };
        const hermione = mkHermioneStub({
            forBrowser: sandbox.stub().withArgs('bro1').returns({testsPerSession: 1})
        });

        plugin(hermione);
        hermione.emit(events.AFTER_FILE_READ, data);

        const browser = mkBrowser();

        return cb.call({browser: Promise.resolve(browser)})
            .then(() => assert.notCalled(browser.getTabIds));
    });
});
