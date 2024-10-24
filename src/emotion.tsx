import React from 'react';
import createCache, { Options } from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ComponentType, StylesInjector } from './types.js';
import { useConnectedPortalsEffect, useShadowDom } from './hooks.js';

// Copied from emotion-cache with minor adjustments to work with multiple containers
// https://github.com/emotion-js/emotion/blob/main/packages/sheet/src/index.js

function sheetForTag(tag: HTMLStyleElement): CSSStyleSheet {
    if (tag.sheet) {
        return tag.sheet
    }

    // this weirdness brought to you by firefox
    for (let i = 0; i < document.styleSheets.length; i++) {
        if (document.styleSheets[i]!.ownerNode === tag) {
            return document.styleSheets[i]!
        }
    }

    return new CSSStyleSheet();
}

type SheetOptions = {
    nonce?: string,
    key: string,
    containers?: Node[],
    container?: Node,
    speedy?: boolean,
    prepend?: boolean,
    insertionPoint?: HTMLElement
}

function createStyleElement(options: {
    key: string,
    nonce: string | void
}): HTMLStyleElement {
    let tag = document.createElement('style')
    tag.setAttribute('data-emotion', options.key)
    if (options.nonce !== undefined) {
        tag.setAttribute('nonce', options.nonce)
    }
    tag.appendChild(document.createTextNode(''))
    tag.setAttribute('data-s', '')
    return tag
}

export class StyleSheet {
    isSpeedy: boolean
    ctr: number
    tags: Array<HTMLStyleElement[]>
    // Using Node instead of HTMLElement since container may be a ShadowRoot
    containers: Node[]
    // HACK: emotion sometimes uses this prop to pass it to newly created StyleSheet (when inserting global styles),
    // so we keep it around
    container: Node[]
    key: string
    nonce: string | void
    prepend: boolean | void
    before: Element | null
    insertionPoint: HTMLElement | void
    constructor(options: SheetOptions) {
        this.isSpeedy =
            options.speedy === undefined
                ? process.env['NODE_ENV'] === 'production'
                : options.speedy
        
        if (!options.containers) {
            options.containers = []
        }
        if (options.container) {
            options.containers.push(...(Array.isArray(options.container) ? options.container : [options.container]))
        }
        if (!options.containers) options.containers = [] 
        this.tags = options.containers.map(c => []);
        this.ctr = 0
        this.nonce = options.nonce
        // key is the value of the data-emotion attribute, it's used to identify different sheets
        this.key = options.key
        this.containers = options.containers
        this.prepend = options.prepend
        this.insertionPoint = options.insertionPoint
        this.before = null
    }

    _insertTags = (tag: HTMLStyleElement) => {
        this.containers.forEach((container, i) => {
            const tagCopy = tag.cloneNode(true);
            let before
            if (this.tags[i]!.length === 0) {
                if (this.insertionPoint) {
                    before = this.insertionPoint.nextSibling
                } else if (this.prepend) {
                    before = container.firstChild
                } else {
                    before = this.before
                }
            } else {
                before = this.tags[i]![this.tags[i]!.length - 1]!.nextSibling
            }
            container.insertBefore(tagCopy, before)
            // @ts-ignore
            this.tags[i].push(tagCopy)
        });
    }

    hydrate(nodes: HTMLStyleElement[]) {
        nodes.forEach(this._insertTags)
    }

    insert(rule: string) {
        // the max length is how many rules we have per style tag, it's 65000 in speedy mode
        // it's 1 in dev because we insert source maps that map a single rule to a location
        // and you can only have one source map per style tag
        if (this.ctr % (this.isSpeedy ? 65000 : 1) === 0) {
            this._insertTags(createStyleElement(this))
        }

        this.containers.forEach((cont, i) => {
            const tag = this.tags[i]![this.tags[i]!.length - 1]!

            if (process.env['NODE_ENV'] !== 'production') {
                const isImportRule =
                    rule.charCodeAt(0) === 64 && rule.charCodeAt(1) === 105

                if (isImportRule && (this as any)._alreadyInsertedOrderInsensitiveRule) {
                    // this would only cause problem in speedy mode
                    // but we don't want enabling speedy to affect the observable behavior
                    // so we report this error at all times
                    console.error(
                        `You're attempting to insert the following rule:\n` +
                        rule +
                        '\n\n`@import` rules must be before all other types of rules in a stylesheet but other rules have already been inserted. Please ensure that `@import` rules are before all other rules.'
                    )
                }

                ; (this as any)._alreadyInsertedOrderInsensitiveRule =
                    (this as any)._alreadyInsertedOrderInsensitiveRule || !isImportRule
            }

            if (this.isSpeedy) {
                const sheet = sheetForTag(tag)
                try {
                    // this is the ultrafast version, works across browsers
                    // the big drawback is that the css won't be editable in devtools
                    sheet.insertRule(rule, sheet.cssRules.length)
                } catch (e) {
                    if (
                        process.env['NODE_ENV'] !== 'production' &&
                        !/:(-moz-placeholder|-moz-focus-inner|-moz-focusring|-ms-input-placeholder|-moz-read-write|-moz-read-only|-ms-clear|-ms-expand|-ms-reveal){/.test(
                            rule
                        )
                    ) {
                        console.error(
                            `There was a problem inserting the following rule: "${rule}"`,
                            e
                        )
                    }
                }
            } else {
                tag.appendChild(document.createTextNode(rule))
            }
        });
        this.ctr++
    }

    flush() {
        this.tags.forEach(tags => tags.forEach(tag => tag.parentNode && tag.parentNode.removeChild(tag)));
        this.tags = this.containers.map(c => []);
        this.ctr = 0
        if (process.env['NODE_ENV'] !== 'production') {
            ; (this as any)._alreadyInsertedOrderInsensitiveRule = false
        }
    }

    addContainer(tag: Node) {
        this.containers.push(tag);
        this.tags.push([]);
    }
}

interface EmotionInjectorOptions {
    stylisPlugins?: Options['stylisPlugins'];
}

export default (options: EmotionInjectorOptions = {}): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        const { stylisPlugins = [] } = options;
        const key = Math.random()
            .toString(36)
            .replace(/[^a-z]+/g, '')
            .slice(0, 5);
        // Some fluck with types. TS thinks createCache isn't callable
        // @ts-ignore
        const cache = createCache({
            key,
            stylisPlugins: stylisPlugins,
            container: stylesWrapper,
        });
        const sheet = new StyleSheet({
            key,
            containers: [stylesWrapper],
        });
        // @ts-ignore
        cache.sheet = sheet;
        return (props: P) => {
            useConnectedPortalsEffect((portals) => {
                portals.forEach(p => {
                    if (!sheet.containers.includes(p.stylesWrapper)) {
                        sheet.addContainer(p.stylesWrapper);
                    }
                });
            });
            return (
                <CacheProvider value={cache}>
                    <Component {...props} />
                </CacheProvider>
            );
        };
    };
};
