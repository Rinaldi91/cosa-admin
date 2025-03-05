"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const BarcodeComponent = ({ value }: { value: string }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, value, {
        format: "CODE128",
        displayValue: true,
        lineColor: "#000",
        width: 2,
        height: 30,
      });
    }
  }, [value]);

  return <svg ref={barcodeRef}></svg>;
};

export default BarcodeComponent;
