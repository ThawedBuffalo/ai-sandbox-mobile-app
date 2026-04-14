import { createContext, useContext } from "react";
import { EstimatorStore } from "./stores/estimatorStore";
import { EstimatorCard } from "./components/EstimatorCard";

const estimatorStore = new EstimatorStore();
const EstimatorStoreContext = createContext<EstimatorStore>(estimatorStore);

export function useEstimatorStore(): EstimatorStore {
  return useContext(EstimatorStoreContext);
}

export function App() {
  return (
    <EstimatorStoreContext value={estimatorStore}>
      <main className="page-shell">
        <section className="gradient-orb orb-left" aria-hidden="true" />
        <section className="gradient-orb orb-right" aria-hidden="true" />
        <EstimatorCard />
      </main>
    </EstimatorStoreContext>
  );
}
