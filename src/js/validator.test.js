/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
    parseQueryString,
    required,
    url,
    integer,
    boolean,
    fallback,
    oneOf,
    atLeastOneRequired,
    oneOfOrEmpty,
} from './validator.js'
import { Params } from './params.js'

describe('validator.js', () => {
    describe('validator.js/parser', () => {
        let data = 'a=5&b=6&c=foo.com&d=yes&__validators=abc'

        it('should apply validators to values', () => {
            expect(parseQueryString(data, {
                a: [required, integer],
                b: [required],
                c: [url],
                d: [boolean],
            }).toString()).to.equal('a=5&b=6&c=https%3A%2F%2Ffoo.com%2F&d=true')
        })

        it('should fail on validators failure', () => {
            expect(() => {
                parseQueryString(data, {
                    f: [required],
                })
            }).to.throw()
        })

        it('should ignore __validators property', () => {
            expect(parseQueryString(data, {
                __validators: [],
            }).toString()).to.equal('')
        })

        it('should apply __validators', () => {
            expect(parseQueryString(data, {
                a: [],
                f: [],
                __validators: [atLeastOneRequired('a', 'f')]
            }).toString()).to.equal('a=5')

            expect(() => {
                parseQueryString(data, {
                    f: [],
                    g: [],
                    __validators: [atLeastOneRequired('f', 'g')]
                })
            }).to.throw()
        })

        it('ignore invalid string', () => {
            expect(parseQueryString('&=?=abc&a=5', {
                __validators: [],
            }).toString()).to.equal('')
        })
    })

    describe('validator.js/required', () => {
        it('should throw on empty value', () => {
            expect(() => { required('', 'whatever') }).to.throw()
            expect(() => { required(null, 'whatever') }).to.throw()
            expect(() => { required(undefined, 'whatever') }).to.throw()
        })

        it('should pass on normal strings', () => {
            expect(required('foo', 'whatever')).to.equal('foo')
        })
    })

    describe('validator.js/httpUrl', () => {
        it('should accept urls with scheme', () => {
            expect(url('http://foo.com', 'whatever')).to.equal('http://foo.com/')
            expect(url('https://foo.com', 'whatever')).to.equal('https://foo.com/')
            expect(url('https://foo.com?q=a', 'whatever')).to.equal('https://foo.com/?q=a')
            expect(url('about:blank', 'whatever')).to.equal('about:blank')
            expect(url('magnet:foo', 'whatever')).to.equal('magnet:foo')
        })

        it('should rewrite urls without scheme to https', () => {
            expect(url('foo.com', 'whatever')).to.equal('https://foo.com/')
            expect(url('foo', 'whatever')).to.equal('https://foo/')
            expect(url('/foo', 'whatever')).to.equal('https://foo/')
            expect(url('//foo', 'whatever')).to.equal('https://foo/')
            expect(url('///foo', 'whatever')).to.equal('https://foo/')
            expect(url('+abc', 'whatever')).to.equal('https://+abc/')
        })

        it('should throw on invalid urls', () => {
            expect(() => { url('?abc', 'whatever') }).to.throw()
            expect(() => { url('/', 'whatever') }).to.throw()
            expect(() => { url('//', 'whatever') }).to.throw()
        })

        it('should ignore null, undefined and empty strings', () => {
            expect(integer(null, 'whatever')).to.equal(null)
            expect(integer(undefined, 'whatever')).to.equal(undefined)
            expect(integer('', 'whatever')).to.equal('')
        })
    })

    describe('validator.js/integer', () => {
        it('should accept integers', () => {
            expect(integer('1', 'whatever')).to.equal(1)
            expect(integer('-1', 'whatever')).to.equal(-1)
        })

        it('should not accept floats and strings', () => {
            expect(() => { integer('1.01', 'whatever') }).to.throw()
            expect(() => { integer('foo', 'whatever') }).to.throw()
            expect(() => { integer('1foo', 'whatever') }).to.throw()
        })

        it('should ignore null, undefined and empty strings', () => {
            expect(integer(null, 'whatever')).to.equal(null)
            expect(integer(undefined, 'whatever')).to.equal(undefined)
            expect(integer('', 'whatever')).to.equal('')
        })
    })

    describe('validator.js/boolean', () => {
        it('should accept booleans', () => {
            expect(boolean('true', 'whatever')).to.equal(true)
            expect(boolean('TrUe', 'whatever')).to.equal(true)
            expect(boolean('yes', 'whatever')).to.equal(true)
            expect(boolean('on', 'whatever')).to.equal(true)
            expect(boolean('1', 'whatever')).to.equal(true)

            expect(boolean('false', 'whatever')).to.equal(false)
            expect(boolean('FaLsE', 'whatever')).to.equal(false)
            expect(boolean('no', 'whatever')).to.equal(false)
            expect(boolean('off', 'whatever')).to.equal(false)
            expect(boolean('0', 'whatever')).to.equal(false)
        })

        it('should not accept anything else', () => {
            expect(() => { boolean('abc', 'whatever') }).to.throw()
            expect(() => { boolean('10', 'whatever') }).to.throw()
            expect(() => { boolean('01', 'whatever') }).to.throw()
        })

        it('should ignore null, undefined and empty strings', () => {
            expect(integer(null, 'whatever')).to.equal(null)
            expect(integer(undefined, 'whatever')).to.equal(undefined)
            expect(integer('', 'whatever')).to.equal('')
        })
    })

    describe('validator.js/fallback', () => {
        it('should not change non-empty values', () => {
            expect(fallback('foo')('bar', 'whatever')).to.equal('bar')
            expect(fallback('foo')(1, 'whatever')).to.equal(1)
            expect(fallback('foo')(true, 'whatever')).to.equal(true)
        })

        it('should change empty values', () => {
            expect(fallback('foo')(null, 'whatever')).to.equal('foo')
            expect(fallback('foo')(undefined, 'whatever')).to.equal('foo')
            expect(fallback('foo')('', 'whatever')).to.equal('foo')
        })
    })

    describe('validator.js/oneOf', () => {
        it('should pass if the parameter is in the preconfigured list', () => {
            expect(oneOf(['a', 'b'])('a')).to.equal('a')
            expect(oneOf(['a', 'b'])('b')).to.equal('b')
            expect(oneOf(['a'])('a')).to.equal('a')
        })

        it('should throw if the parameter is not in the precofigured list', () => {
            expect(() => { oneOf(['a', 'b'])('c') }).to.throw()
            expect(() => { oneOf(['a', 'b'])('') }).to.throw()
            expect(() => { oneOf([])('a') }).to.throw()
        })
    })

    describe('validator.js/oneOfOrEmpty', () => {
        it('should pass if the parameter is in the preconfigured list', () => {
            expect(oneOf(['a', 'b'])('a')).to.equal('a')
            expect(oneOf(['a', 'b'])('b')).to.equal('b')
            expect(oneOf(['a'])('a')).to.equal('a')
        })

        it('should pass if the parameter is empty', () => {
            expect(oneOfOrEmpty(['a', 'b'])('')).to.equal('')
        })

        it('should throw if the parameter is not in the precofigured list', () => {
            expect(() => { oneOf(['a', 'b'])('c') }).to.throw()
            expect(() => { oneOf([])('a') }).to.throw()
        })
    })

    describe('validator.js/atLeastOneRequired', () => {
        const v = atLeastOneRequired(['a', 'b'])

        it('should pass when at least one parameter is present', () => {
            expect(() => { v(new Params({ a: 5, b: null })) }).to.not.throw()
            expect(() => { v(new Params({ a: null, b: 5 })) }).to.not.throw()
            expect(() => { v(new Params({ a: 5, b: 5 })) }).to.not.throw()
            expect(() => { v(new Params({ a: 5 })) }).to.not.throw()
        })

        it('should fail when none of the parameters is present', () => {
            expect(() => { v(new Params({ c: 5 })) }).to.throw()
            expect(() => { v(new Params({ a: null, b: '', c: 5 })) }).to.throw()
            expect(() => { v(new Params({ a: null, c: 5 })) }).to.throw()
        })
    })
})