import React from 'react';
import { Context } from './context';

export const useShadowDom = () => {
    return React.useContext(Context);
};
