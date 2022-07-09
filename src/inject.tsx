import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMClient from 'react-dom/client';
import { InjectableComponent } from './wrapper.js';
import { v4 as uuidv4 } from 'uuid';
import { Context } from './context.js';
import { ComponentType } from './types.js';

interface InjectOptions {
    includeCssReset?: boolean;
}

interface InjectionResult<P> {
    id: string;
    shadowHost: HTMLDivElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    updateProps: (newProps: Partial<P>) => Promise<void>;
    unmount: () => Promise<void>;
}

interface RenderResult<P> {
    updateProps: InjectionResult<P>['updateProps'];
    unmount: InjectionResult<P>['unmount'];
}

const importOrNull = async (path: string): Promise<any> => {
    try {
        return await import(path);
    } catch (e) {
        return null;
    }
};

const mountUsingProperReactApi = async <P,>(
    Component: ComponentType<P>,
    props: P,
    mountInto: HTMLDivElement
): Promise<RenderResult<P>> => {
    let propsSaved = { ...props };
    if (ReactDOMClient && ReactDOMClient.createRoot) {
        const root = ReactDOMClient.createRoot(mountInto);
        root.render(<Component {...propsSaved} />);
        return {
            updateProps: async (newProps) => {
                propsSaved = { ...propsSaved, ...newProps };
                root.render(<Component {...propsSaved} />);
            },
            unmount: async () => root.unmount(),
        };
    } else {
        return new Promise((resolve) => {
            ReactDOM.render(<Component {...propsSaved} />, mountInto, () => {
                const result: RenderResult<P> = {
                    updateProps: (newProps) => {
                        return new Promise((resolve) => {
                            propsSaved = { ...propsSaved, ...newProps };
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
    }
};

export const injectComponent = async <P,>(
    injectable: InjectableComponent<P>,
    props: P,
    options: InjectOptions = {}
): Promise<InjectionResult<P>> => {
    const {includeCssReset = true} = options;
    const id = uuidv4();
    const shadowHost = document.createElement('div');
    shadowHost.id = id;
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' }); // Should this be an option?
    const mountedInto = document.createElement('div');
    mountedInto.classList.add('inject-react-anywhere-mounted-into');
    shadowRoot.appendChild(mountedInto);

    if (includeCssReset) {
        const styleTag = document.createElement('style');
        styleTag.innerHTML = '*, *::before, *::after {all: initial;}';
        shadowRoot.appendChild(styleTag);
    }

    const ComponentWithStyles = injectable.stylesInjector(injectable.component, shadowHost, shadowRoot, mountedInto);
    const Component = (props: P) => {
        return (
            <Context.Provider
                value={{
                    insideShadowDom: true,
                    shadowHost,
                    shadowRoot,
                    mountedInto,
                    unmountRoot: () => {
                        renderResults.unmount();
                    },
                }}
            >
                <ComponentWithStyles {...props}/>
            </Context.Provider>
        );
    } ;

    const renderResults = await mountUsingProperReactApi(Component, props, mountedInto);
    return {
        id,
        shadowHost,
        shadowRoot,
        mountedInto,
        ...renderResults,
    };
};
