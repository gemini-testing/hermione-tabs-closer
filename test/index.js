'use strict';

const plugin = require('../');
const EventEmitter = require('events');

const events = {AFTER_TESTS_READ: 'after_tests_read'};

describe('hermione tabs closer', () => {
    const sandbox = sinon.sandbox.create();

    const mkHermioneStub = (config) => {
        const hermione = new EventEmitter();

        hermione.events = events;
        hermione.config = config || {forBrowser: () => ({testsPerSession: 10})};
        hermione.isWorker = () => true;

        return hermione;
    };

    const mkBrowser = () => {
        return {
            switchTab: sandbox.stub().resolves(),
            getTabIds: sandbox.stub().resolves(['tab1', 'tab2', 'tab3']),
            close: sandbox.stub().resolves()
        };
    };

    it('should do nothing in master process', () => {
        const hermione = mkHermioneStub();
        hermione.isWorker = () => false;

        plugin(hermione);

        const eachRootSuite = sinon.spy().named('eachRootSuite');
        hermione.emit(events.AFTER_TESTS_READ, {eachRootSuite});

        assert.notCalled(eachRootSuite);
    });

    it('should not add hook for browsers which not match to RegExp', () => {
        const hermione = mkHermioneStub();
        plugin(hermione, {browsers: /bro2/});

        const suite = {beforeEach: sinon.spy().named('beforeEach')};
        hermione.emit(events.AFTER_TESTS_READ, {
            eachRootSuite: (cb) => cb(suite, 'bro1')
        });

        assert.notCalled(suite.beforeEach);
    });

    it('should not add hook for browsers with one test per session', () => {
        const hermione = mkHermioneStub({
            forBrowser: sandbox.stub().withArgs('bro1').returns({testsPerSession: 1})
        });

        plugin(hermione);

        const suite = {beforeEach: sinon.spy().named('beforeEach')};
        hermione.emit(events.AFTER_TESTS_READ, {
            eachRootSuite: (cb) => cb(suite, 'bro1')
        });

        assert.notCalled(suite.beforeEach);
    });

    it('should close all opened tabs except last tab', async () => {
        const hermione = mkHermioneStub();
        plugin(hermione);

        const suite = {beforeEach: sinon.spy().named('beforeEach')};
        const browser = mkBrowser();
        hermione.emit(events.AFTER_TESTS_READ, {
            eachRootSuite: (cb) => cb(suite, browser)
        });

        const beforeEachHook = suite.beforeEach.lastCall.args[0];
        await beforeEachHook.call({browser});

        assert.calledWith(browser.switchTab, 'tab1');
        assert.calledWith(browser.close, 'tab2');
        assert.calledWith(browser.close, 'tab3');
        assert.neverCalledWith(browser.close, 'tab1');
    });
});
