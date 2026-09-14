import React, { TableHTMLAttributes } from "react";

export interface GlassTableProps extends TableHTMLAttributes<HTMLTableElement> {
  wrapperClassName?: string;
}

export const GlassTable: React.FC<GlassTableProps> = ({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl glass-panel-subtle ${wrapperClassName}`}>
      <table className={`glass-table ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};
