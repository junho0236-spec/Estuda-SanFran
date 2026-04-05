import React from 'react';
import ForjaShell, { type ForjaShellProps } from './forja/ForjaShell';

const SistemaForja: React.FC<ForjaShellProps> = (props) => {
  return (
    <div className="flex flex-col -mx-4 md:-mx-10 -mt-4 md:-mt-10 mb-0 flex-1 min-h-0">
      <ForjaShell {...props} />
    </div>
  );
};

export default SistemaForja;
