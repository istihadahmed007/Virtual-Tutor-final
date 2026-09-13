import React from "react";

export const VesperLandingPage: React.FC = () => {
  return (
    <iframe
      src="/vesper.html"
      title="Vesper.ai — Operational AI Infrastructure"
      className="w-screen h-screen border-none m-0 p-0 block bg-black"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 9999,
        background: "#000000",
      }}
    />
  );
};

export default VesperLandingPage;
