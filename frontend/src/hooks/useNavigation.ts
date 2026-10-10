import { useEffect, useState } from "react";
import type { ModuleId } from "../types";
const modules: ModuleId[] = [
  "command",
  "core",
  "conversations",
  "tasks",
  "agents",
  "memory",
  "tools",
  "workflows",
  "settings",
];
function currentModule(): ModuleId {
  const value = window.location.hash.slice(1) as ModuleId;
  return modules.includes(value) ? value : "command";
}
export function useNavigation() {
  const [module, setModule] = useState(currentModule);
  useEffect(() => {
    const update = () => setModule(currentModule());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const navigate = (next: ModuleId) => {
    window.location.hash = next;
    setModule(next);
  };
  return { module, navigate };
}
