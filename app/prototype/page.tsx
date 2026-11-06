import type { Metadata } from "next";
import Workflow from "./Workflow";

export const metadata: Metadata = {
  title: "Auraly AI Prototype",
  description: "Four-step reflective writing prototype",
};

export default function PrototypePage() {
  return <Workflow />;
}
