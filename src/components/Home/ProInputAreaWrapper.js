import React from 'react';
import ProInputAreaEnhanced from './ProInputAreaEnhanced';

/**
 * ProInputArea - Wrapper component that exports the enhanced version
 * This provides backward compatibility while using the new enhanced features
 */
const ProInputArea = React.forwardRef((props, ref) => {
  return React.createElement(ProInputAreaEnhanced, { ...props, ref });
});

ProInputArea.displayName = 'ProInputArea';

export default ProInputArea;
