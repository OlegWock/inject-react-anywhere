import React from 'react';
import { ShadowPortal } from './types.js';

export interface ContextTypeDefault {
    insideShadowDom: false;
    shadowHost: null;
    shadowRoot: null;
    mountedInto: null;
    stylesWrapper: null;
    unmountRoot: null;
    connectedPortals: [],
}

export interface ContextTypeExtended {
    insideShadowDom: true;
    shadowHost: HTMLElement;
    shadowRoot: ShadowRoot;
    mountedInto: HTMLDivElement;
    stylesWrapper: HTMLDivElement;
    unmountRoot: () => void;
    connectedPortals: ShadowPortal[]
}

export type ContextType = ContextTypeDefault | ContextTypeExtended;

export const Context = React.createContext<ContextType>({
    insideShadowDom: false,
    shadowHost: null,
    shadowRoot: null,
    mountedInto: null,
    stylesWrapper: null,
    unmountRoot: null,
    connectedPortals: [],
});
