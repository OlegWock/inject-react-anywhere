import React from 'react';
import { ComponentType, StylesInjector } from './types.js';

type StylesOptions = null | string[] | StylesInjector;

interface CreateInjectableComponentOptions {
    styles: StylesOptions;
    name?: string;
}

export interface InjectableComponent<P> {
    name: string;
    component: ComponentType<P>;
    stylesInjector: StylesInjector;
}

const createNoopStylesInjector = (): StylesInjector => {
    return <T, P>(
        Component: ComponentType<P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
    ) => {
        return Component;
    };
};

export const stringStyles = (styles: string[]): StylesInjector => {
    return <P,>(
        Component: ComponentType<P>,
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

export const combineStyleInjectors = (...injectors: StylesInjector[]): StylesInjector => {
    return <P,>(
        Component: ComponentType<P>,
        shadowHost: HTMLDivElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement
    ) => {
        let LocalComponent = Component;
        injectors.forEach(injector => {
            LocalComponent = injector(LocalComponent, shadowHost, shadowRoot, mountingInto);
        });
        return LocalComponent;
    }
};

export const createInjectableComponent = <P,>(
    component: ComponentType<P>,
    options: CreateInjectableComponentOptions
): InjectableComponent<P> => {
    let stylesInjector: StylesInjector;
    if (options.styles === null || (Array.isArray(options.styles) && options.styles.length === 0)) {
        stylesInjector = createNoopStylesInjector();
    } else if (Array.isArray(options.styles) && options.styles.length !== 0 && typeof options.styles[0] === 'string') {
        stylesInjector = stringStyles(options.styles);
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
