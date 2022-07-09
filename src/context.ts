import React from 'react';

interface ContextTypeDefault {
    insideShadowDom: false;
}

interface ContextTypeExtended {
    insideShadowDom: true;
    shadowHost: HTMLDivElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    unmountRoot: () => void;
}

type ContextType = ContextTypeDefault | ContextTypeExtended;

export const Context = React.createContext<ContextType>({
    insideShadowDom: false,
});
