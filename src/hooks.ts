import React from 'react';
import { Context } from './context.js';
import { ShadowPortal } from './types.js';

export const useShadowDom = () => {
    return React.useContext(Context);
};

export const useConnectedPortalsEffect = (cb: (portals: ShadowPortal[]) => void) => {
    const { connectedPortals } = useShadowDom();
    const effect = React.useInsertionEffect || React.useLayoutEffect;
    effect(() => {
        cb(connectedPortals);
    }, [connectedPortals]);
};