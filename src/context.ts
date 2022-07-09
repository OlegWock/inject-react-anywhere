import React from 'react';

export interface ContextTypeDefault {
    insideShadowDom: false;
    shadowHost: null;
    shadowRoot: null;
    mountedInto: null;
    unmountRoot: null;
}

export interface ContextTypeExtended {
    insideShadowDom: true;
    shadowHost: HTMLDivElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    unmountRoot: () => void;
}

export type ContextType = ContextTypeDefault | ContextTypeExtended;

export const Context = React.createContext<ContextType>({
    insideShadowDom: false,
    shadowHost: null,
    shadowRoot: null,
    mountedInto: null,
    unmountRoot: null,
});
