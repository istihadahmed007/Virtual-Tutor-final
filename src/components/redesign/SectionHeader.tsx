import React from "react";
import { SectionLabel } from "./SectionLabel";

interface SectionHeaderProps {
  number?: string | number;
  label?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  number,
  label,
  title,
  description,
  align = "left",
  className = "",
}) => {
  return (
    <div
      className={`max-w-3xl ${
        align === "center" ? "mx-auto text-center items-center flex flex-col" : ""
      } ${className}`}
    >
      {(label || number !== undefined) && (
        <div className="mb-4 sm:mb-6">
          <SectionLabel number={number} text={label || ""} />
        </div>
      )}

      <h2 className="text-[1.75rem] sm:text-[2.25rem] lg:text-[2.75rem] font-medium leading-[1.12] tracking-[-0.03em] text-[#111111]">
        {title}
      </h2>

      {description && (
        <p className="mt-4 sm:mt-5 text-sm sm:text-base text-[#111111]/70 leading-[1.65] max-w-2xl font-normal">
          {description}
        </p>
      )}
    </div>
  );
};
