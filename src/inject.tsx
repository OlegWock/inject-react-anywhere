import React from 'react';
import ReactDOM from 'react-dom';
import { InjectableComponent } from './wrapper.js';
import { v4 as uuidv4 } from 'uuid';
import { Context } from './context.js';
import { ComponentType, ShadowPortal } from './types.js';
import { createMirror } from './mirror-node.js';

interface InjectOptions<P> {
    shadowHost?: HTMLElement;
    includeCssReset?: boolean;
    useClosedShadow?: boolean;
    mountStrategy?: (Component: ComponentType<P & InjectComponentInternalProps>, props: P & InjectComponentInternalProps, mountInto: HTMLDivElement) => Promise<RenderResult<P>>;
}

export interface InjectionResult<P> {
    id: string;
    shadowHost: HTMLElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    stylesWrapper: HTMLDivElement;
    updateProps: (newProps: Partial<P>) => Promise<void>;
    unmount: () => Promise<void>;
    mirrorStylesInto: (node: HTMLElement) => void;
    connectPortal: (portal: ShadowPortal) => void;
}

export interface RenderResult<P> {
    updateProps: InjectionResult<P>['updateProps'];
    unmount: InjectionResult<P>['unmount'];
}

const mountUsingReactDomRender = async <P,>(
    Component: ComponentType<P & InjectComponentInternalProps>,
    props: P & InjectComponentInternalProps,
    mountInto: HTMLDivElement
): Promise<RenderResult<P>> => {
    let propsSaved = { ...props };
    return new Promise((resolve) => {
        // @ts-ignore
        ReactDOM.render(<Component {...propsSaved} />, mountInto, () => {
            const result: RenderResult<P> = {
                updateProps: (newProps) => {
                    return new Promise((resolve) => {
                        propsSaved = { ...propsSaved, ...newProps };
                        // @ts-ignore
                        ReactDOM.render(<Component {...propsSaved} />, mountInto, () => {
                            resolve();
                        });
                    });
                },
                unmount: () => {
                    return new Promise((resolve) => {
                        ReactDOM.unmountComponentAtNode(mountInto);
                        resolve();
                    });
                },
            };
            resolve(result);
        });
    });
};

type InjectComponentInternalProps = {
    connectedPortals: ShadowPortal[],
};

export const injectComponent = async <P extends {}>(
    injectable: InjectableComponent<P>,
    props: P,
    options: InjectOptions<P> = {}
): Promise<InjectionResult<P>> => {
    const { includeCssReset = true, mountStrategy = mountUsingReactDomRender } = options;
    const id = uuidv4();
    const shadowHost = options.shadowHost || document.createElement('div');
    if (!options.shadowHost) shadowHost.id = id; // Don't mess with elements provided by user
    const shadowRoot = shadowHost.attachShadow({ mode: options.useClosedShadow ? 'closed' : 'open' });
    const mountedInto = document.createElement('div');
    const stylesWrapper = document.createElement('div');
    mountedInto.classList.add('inject-react-anywhere-mounted-into');
    shadowRoot.appendChild(mountedInto);
    shadowRoot.appendChild(stylesWrapper);

    const connectedPortals: ShadowPortal[] = [];

    if (includeCssReset) {
        const styleTag = document.createElement('style');
        styleTag.innerHTML =
            '.inject-react-anywhere-mounted-into, .inject-react-anywhere-mounted-into::before, .inject-react-anywhere-mounted-into::after {all: initial;}';
        stylesWrapper.appendChild(styleTag);
    }

    const ComponentWithStyles = await injectable.stylesInjector(
        injectable.component,
        shadowHost,
        shadowRoot,
        mountedInto,
        stylesWrapper
    );

    const Component = ({ connectedPortals, ...props }: P & InjectComponentInternalProps) => {
        return (
            <Context.Provider
                value={{
                    insideShadowDom: true,
                    shadowHost,
                    shadowRoot,
                    mountedInto,
                    stylesWrapper,
                    unmountRoot: () => {
                        renderResults.unmount();
                    },
                    connectedPortals,
                }}
            >
                <ComponentWithStyles {...props as unknown as P} />
            </Context.Provider>
        );
    };

    await new Promise(r => setTimeout(r, 0)); // Give browser type to parse/apply styles

    const finalProps = {
        ...props,
        connectedPortals,
    };
    const renderResults = await mountStrategy(Component, finalProps, mountedInto);
    return {
        id,
        shadowHost,
        shadowRoot,
        mountedInto,
        stylesWrapper,
        mirrorStylesInto: (node: HTMLElement) => {
            createMirror(stylesWrapper, node);
        },
        connectPortal: (portal: ShadowPortal) => {
            if (connectedPortals.includes(portal)) return;
            connectedPortals.push(portal);
            // @ts-ignore Unknown prop because we don't expose internal props in types
            renderResults.updateProps({ connectedPortals });
        },
        ...renderResults,
    };
};

export const createShadowPortal = (): ShadowPortal => {
    const id = uuidv4();
    const shadowHost = document.createElement('div');
    shadowHost.id = id;
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' }); // Should this be an option?
    const mountedInto = document.createElement('div');
    const stylesWrapper = document.createElement('div');
    mountedInto.classList.add('inject-react-anywhere-portal-mounted-into');
    shadowRoot.appendChild(mountedInto);
    shadowRoot.appendChild(stylesWrapper);

    return {
        shadowHost,
        shadowRoot,
        portalInto: mountedInto,
        stylesWrapper,
    };
};
