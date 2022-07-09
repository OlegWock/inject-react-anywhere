import React from 'react';
import { Context } from './context.js';

export const useShadowDom = () => {
    return React.useContext(Context);
};
