import React, { useRef } from 'react';
import { ComponentType, ShadowPortal, StylesInjector } from './types.js';
import { useConnectedPortalsEffect } from './hooks.js';

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
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        return Component;
    };
};

export const stringStyles = (styles: string[]): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        const combined = styles.join('\n');
        const styleTag = document.createElement('style');
        styleTag.append(document.createTextNode(combined));
        stylesWrapper.append(styleTag);

        return (props: P) => {
            const handledPortalsRef = useRef(new Set<ShadowPortal>());

            useConnectedPortalsEffect((portals) => {
                portals.forEach((portal) => {
                    if (!handledPortalsRef.current.has(portal)) {
                        handledPortalsRef.current.add(portal);
                        portal.stylesWrapper.append(styleTag.cloneNode(true));
                    }
                });
            });
            return (<Component {...props} />);
        };
    };
};

export const remoteStyles = (urls: string[]): StylesInjector => {
    return <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        const tags = urls.map((url) => {
            const tag = document.createElement('link');
            tag.rel = 'stylesheet';
            tag.href = url;
            return tag;
        });
        stylesWrapper.append(...tags);
        return (props: P) => {
            const handledPortalsRef = useRef(new Set<ShadowPortal>());

            useConnectedPortalsEffect((portals) => {
                portals.forEach((portal) => {
                    if (!handledPortalsRef.current.has(portal)) {
                        handledPortalsRef.current.add(portal);
                        const copiedTags = tags.map(tag => tag.cloneNode(true))
                        portal.stylesWrapper.append(...copiedTags);
                    }
                });
            });
            return (<Component {...props} />);
        };
    };
};

export const combineStyleInjectors = (...injectors: StylesInjector[]): StylesInjector => {
    return async <P extends JSX.IntrinsicAttributes>(
        Component: ComponentType<P>,
        shadowHost: HTMLElement,
        shadowRoot: ShadowRoot,
        mountingInto: HTMLDivElement,
        stylesWrapper: HTMLDivElement
    ) => {
        let LocalComponent = Component;
        for (const injector of injectors) {
            LocalComponent = await injector(LocalComponent, shadowHost, shadowRoot, mountingInto, stylesWrapper);
        }
        return LocalComponent;
    };
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
