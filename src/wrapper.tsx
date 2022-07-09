import React from 'react';
import { ComponentType, StylesInjector } from './types.js';

type StylesOptions = null | string[] | StylesInjector;

interface CreateInjectableComponentOptions {
    styles: StylesOptions;
    name?: string;
}

export interface InjectableComponent<T, P> {
    name: string;
    component: ComponentType<T, P>;
    stylesInjector: StylesInjector;
}

const createNoopStylesInjector = (): StylesInjector => {
    return <T, P>(
        Component: ComponentType<T, P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
    ) => {
        return Component;
    };
};

const createStringStylesInjector = (styles: string[]): StylesInjector => {
    return <T, P>(
        Component: ComponentType<T, P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
    ) => {
        const combined = styles.join('\n');
        const styleTag = document.createElement('style');
        styleTag.append(document.createTextNode(combined));
        shadowRoot.append(styleTag);
        return Component;
    };
};

export const createInjectableComponent = <T, P>(
    component: ComponentType<T, P>,
    options: CreateInjectableComponentOptions
): InjectableComponent<T, P> => {
    let stylesInjector: StylesInjector;
    if (options.styles === null || (Array.isArray(options.styles) && options.styles.length === 0)) {
        stylesInjector = createNoopStylesInjector();
    } else if (Array.isArray(options.styles) && options.styles.length !== 0 && typeof options.styles[0] === 'string') {
        stylesInjector = createStringStylesInjector(options.styles);
    } else if (typeof options.styles === 'function') {
        stylesInjector = options.styles;
    } else {
        throw new Error('Incorrect value for `styles` was provided');
    }

    return {
        component,
        name: options.name || component.displayName || component.name,
        stylesInjector,
    };
};
