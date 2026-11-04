import type React from "react";

export interface Props {
  title: string;
}

export const Card: React.FC<Props> = ({ title }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
    </div>
  );
};
