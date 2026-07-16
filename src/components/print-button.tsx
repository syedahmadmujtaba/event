"use client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
      <Printer /> Print
    </Button>
  );
}
