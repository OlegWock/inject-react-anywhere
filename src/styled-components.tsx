import React, { useContext, useMemo } from 'react';
import * as sc from 'styled-components';

import { ComponentType, ShadowPortal, StylesInjector } from './types.js';
import { useShadowDom } from './hooks.js';

interface StyledComponentsInjectorOptions {
    disableCSSOMInjection?: boolean;
    disableVendorPrefixes?: boolean;
    stylisPlugins?: sc.StyleSheetManagerProps['stylisPlugins'];
}

const SPLITTER = '/*!sc*/\n';

const makeGroupedTag = (tag: any) => {
    return new DefaultGroupedTag(tag);
};

const BASE_SIZE = 1 << 9;

const DefaultGroupedTag = class DefaultGroupedTag {
    groupSizes: Uint32Array;
    length: number;
    tag: any;

    constructor(tag: any) {
        this.groupSizes = new Uint32Array(BASE_SIZE);
        this.length = BASE_SIZE;
        this.tag = tag;
    }

    indexOfGroup(group: number) {
        let index = 0;
        for (let i = 0; i < group; i++) {
            index += this.groupSizes[i]!;
        }

        return index;
    }

    insertRules(group: number, rules: string[]) {
        if (group >= this.groupSizes.length) {
            const oldBuffer = this.groupSizes;
            const oldSize = oldBuffer.length;

            let newSize = oldSize;
            while (group >= newSize) {
                newSize <<= 1;
                if (newSize < 0) {
                    throw new Error(`Styled components error with code: 16, arg: ${group}`);
                }
            }

            this.groupSizes = new Uint32Array(newSize);
            this.groupSizes.set(oldBuffer);
            this.length = newSize;

            for (let i = oldSize; i < newSize; i++) {
                this.groupSizes[i] = 0;
            }
        }

        let ruleIndex = this.indexOfGroup(group + 1);

        for (let i = 0, l = rules.length; i < l; i++) {
            if (this.tag.insertRule(ruleIndex, rules[i])) {
                this.groupSizes[group]++;
                ruleIndex++;
            }
        }
    }

    clearGroup(group: number) {
        if (group < this.length) {
            const length = this.groupSizes[group]!;
            const startIndex = this.indexOfGroup(group);
            const endIndex = startIndex + length;

            this.groupSizes[group] = 0;

            for (let i = startIndex; i < endIndex; i++) {
                this.tag.deleteRule(startIndex);
            }
        }
    }

    getGroup(group: number) {
        let css = '';
        if (group >= this.length || this.groupSizes[group] === 0) {
            return css;
        }

        const length = this.groupSizes[group]!;
        const startIndex = this.indexOfGroup(group);
        const endIndex = startIndex + length;

        for (let i = startIndex; i < endIndex; i++) {
            css += `${this.tag.getRule(i)}${SPLITTER}`;
        }

        return css;
    }
};

function getNonce() {
    // @ts-ignore
    return typeof __webpack_nonce__ !== 'undefined' ? __webpack_nonce__ : null;
}

const SC_ATTR: string =
    // @ts-ignore
    (typeof process !== 'undefined' &&
        // @ts-ignore
        typeof process.env !== 'undefined' &&
        // @ts-ignore
        (process.env.REACT_APP_SC_ATTR || process.env.SC_ATTR)) ||
    'data-styled';

const SC_ATTR_ACTIVE = 'active';

const findLastStyleTag = (target: HTMLElement): void | HTMLStyleElement => {
    const arr = Array.from(target.querySelectorAll<HTMLStyleElement>(`style[${SC_ATTR}]`));

    return arr[arr.length - 1];
}

const makeStyleTag = (target?: HTMLElement | undefined): HTMLStyleElement => {
    const head = document.head;
    const parent = target || head;
    const style = document.createElement('style');
    const prevStyle = findLastStyleTag(parent);
    const nextSibling = prevStyle !== undefined ? prevStyle.nextSibling : null;

    style.setAttribute(SC_ATTR, SC_ATTR_ACTIVE);

    const nonce = getNonce();

    if (nonce) style.setAttribute('nonce', nonce);

    parent.insertBefore(style, nextSibling);

    return style;
};

const getSheet = (tag: HTMLStyleElement): CSSStyleSheet => {
    if (tag.sheet) {
        return tag.sheet as any as CSSStyleSheet;
    }

    // Avoid Firefox quirk where the style element might not have a sheet property
    const { styleSheets } = document;
    for (let i = 0, l = styleSheets.length; i < l; i++) {
        const sheet = styleSheets[i]!;
        if (sheet.ownerNode === tag) {
            return sheet as any as CSSStyleSheet;
        }
    }

    throw new Error('Styled components error with code 17');
}

const makeTag = ({ isServer, useCSSOMInjection, target }: {isServer: boolean, useCSSOMInjection: boolean, target: HTMLElement[]}) => {
    if (isServer) {
        return new VirtualTag(target[0]);
    } else if (useCSSOMInjection) {
        return new CSSOMTag(target);
    } else {
        return new TextTag(target);
    }
};

const CSSOMTag = class CSSOMTag {
    elements: HTMLStyleElement[];
    sheets: CSSStyleSheet[];

    length: number;

    constructor(targets: (HTMLElement | undefined)[]) {
        this.elements = targets.map(target => makeStyleTag(target));

        // Avoid Edge bug where empty style elements don't create sheets
        this.elements.forEach(element => element.appendChild(document.createTextNode('')));

        this.sheets = this.elements.map(element => getSheet(element));
        this.length = 0;
    }

    insertRule(index: number, rule: string): boolean {
        try {
            this.sheets.forEach(sheet => sheet.insertRule(rule, index));
            this.length++;
            return true;
        } catch (_error) {
            return false;
        }
    }

    deleteRule(index: number): void {
        this.sheets.forEach(sheet => sheet.deleteRule(index));
        this.length--;
    }

    getRule(index: number): string {
        const rule = this.sheets[0]!.cssRules[index];

        // Avoid IE11 quirk where cssText is inaccessible on some invalid rules
        if (rule && rule.cssText) {
            return rule.cssText;
        } else {
            return '';
        }
    }
};

/** A Tag that emulates the CSSStyleSheet API but uses text nodes */
const TextTag = class TextTag {
    elements: HTMLStyleElement[];
    nodesMatrix: Array<NodeListOf<Node>>;
    length: number;

    constructor(targets: (HTMLElement | undefined)[]) {
        this.elements = targets.map(target => makeStyleTag(target));
        this.nodesMatrix = this.elements.map(el => el.childNodes);
        this.length = 0;
    }

    insertRule(index: number, rule: string) {
        if (index <= this.length && index >= 0) {
            this.nodesMatrix.forEach((ln, li) => {
                const node = document.createTextNode(rule);
                const refNode = ln[index];
                this.elements[li]!.insertBefore(node, refNode || null);
            })
            this.length++;
            return true;
        } else {
            return false;
        }
    }

    deleteRule(index: number) {
        this.elements.forEach((el, i) => {
            el.removeChild(this.nodesMatrix[i]![index]!);
        });
        this.length--;
    }

    getRule(index: number) {
        if (index < this.length) {
            return this.nodesMatrix[0]![index]!.textContent as string;
        } else {
            return '';
        }
    }
};

/** A completely virtual (server-side) Tag that doesn't manipulate the DOM */
const VirtualTag = class VirtualTag {
    rules: string[];

    length: number;

    constructor(_target?: HTMLElement | undefined) {
        this.rules = [];
        this.length = 0;
    }

    insertRule(index: number, rule: string) {
        if (index <= this.length) {
            this.rules.splice(index, 0, rule);
            this.length++;
            return true;
        } else {
            return false;
        }
    }

    deleteRule(index: number) {
        this.rules.splice(index, 1);
        this.length--;
    }

    getRule(index: number) {
        if (index < this.length) {
            return this.rules[index];
        } else {
            return '';
        }
    }
};

const useMonkeyPatchSheet = () => {
    // @ts-ignore
    const { styleSheet } = useContext(sc.StyleSheetContext);
    useMemo(() => {
        const originalMethod = styleSheet.reconstructWithOptions;
        styleSheet.reconstructWithOptions = (opts: any, withNames: any) => {
            const newSheet = originalMethod(opts, withNames);
            newSheet.getTag = () => {
                console.log('Patched styled-components getTag called');
                return newSheet.tag || (newSheet.tag = makeGroupedTag(makeTag(newSheet.options)));
            };

            return newSheet;
        };
    }, [styleSheet]);
};

export default (options: StyledComponentsInjectorOptions = {}): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        const { disableCSSOMInjection = false, disableVendorPrefixes = false, stylisPlugins = [] } = options;
        return (props: P) => {
            useMonkeyPatchSheet();
            const { insideShadowDom, connectedPortals } = useShadowDom();
            const styleTargets = useMemo(() => [stylesWrapper, ...connectedPortals.map((p: ShadowPortal) => p.stylesWrapper)], []);
            return (
                <sc.StyleSheetManager
                    disableCSSOMInjection={disableCSSOMInjection}
                    disableVendorPrefixes={disableVendorPrefixes}
                    // @ts-ignore
                    enableVendorPrefixes={!disableVendorPrefixes}
                    stylisPlugins={stylisPlugins}
                    // @ts-ignore
                    target={styleTargets}
                >
                    <Component {...props} />
                </sc.StyleSheetManager>
            );
        };
    };
};
