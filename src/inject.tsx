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

interface InjectionResult<T, P> {
    id: string;
    shadowHost: HTMLDivElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    updateProps: (newProps: Partial<P>) => Promise<void>;
    ref: React.Ref<T>;
    unmount: () => Promise<void>;
}

interface RenderResult<T, P> {
    updateProps: InjectionResult<T, P>['updateProps'];
    ref: InjectionResult<T, P>['ref'];
    unmount: InjectionResult<T, P>['unmount'];
}

const importOrNull = async (path: string): Promise<any> => {
    try {
        return await import(path);
    } catch (e) {
        return null;
    }
};

const mountUsingProperReactApi = async <T, P>(
    Component: ComponentType<T, P>,
    props: P,
    mountInto: HTMLDivElement
): Promise<RenderResult<T, P>> => {
    let propsSaved = { ...props };
    const ref = React.createRef<T>();
    if (ReactDOMClient && ReactDOMClient.createRoot) {
        const root = ReactDOMClient.createRoot(mountInto);
        root.render(<Component {...propsSaved} ref={ref} />);
        return {
            updateProps: async (newProps) => {
                propsSaved = { ...propsSaved, ...newProps };
                root.render(<Component {...propsSaved} />);
            },
            ref: ref,
            unmount: async () => root.unmount(),
        };
    } else {
        return new Promise((resolve) => {
            ReactDOM.render(<Component {...propsSaved} ref={ref} />, mountInto, () => {
                const result: RenderResult<T, P> = {
                    ref: ref,
                    updateProps: (newProps) => {
                        return new Promise((resolve) => {
                            propsSaved = { ...propsSaved, ...newProps };
                            ReactDOM.render(<Component {...propsSaved} ref={ref} />, mountInto, () => {
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

export const injectComponent = async <T, P>(
    injectable: InjectableComponent<T, P>,
    props: P,
    options: InjectOptions = {}
): Promise<InjectionResult<T, P>> => {
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
    const Component = React.forwardRef<T, P>((props: P, ref: React.Ref<T>) => {
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
                <ComponentWithStyles {...props} ref={ref} />
            </Context.Provider>
        );
    }) as unknown as ComponentType<T, P>;

    const renderResults = await mountUsingProperReactApi<T, P>(Component, props, mountedInto);
    return {
        id,
        shadowHost,
        shadowRoot,
        mountedInto,
        ...renderResults,
    };
};
