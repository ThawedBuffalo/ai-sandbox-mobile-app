import { observer } from "mobx-react-lite";
import { FormEvent } from "react";
import { useEstimatorStore } from "../App";

function asCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export const EstimatorCard = observer(function EstimatorCard() {
  const store = useEstimatorStore();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await store.estimate();
  };

  return (
    <section className="card" aria-labelledby="estimator-title">
      <h1 id="estimator-title">Dental Cost Estimator</h1>
      <p className="subtitle">Estimate plan and member responsibility instantly.</p>

      <form onSubmit={handleSubmit} className="grid-form">
        <label htmlFor="treatment-cost">Treatment Cost</label>
        <input
          id="treatment-cost"
          name="treatment-cost"
          type="number"
          min="0"
          step="0.01"
          value={store.billedAmount}
          onChange={(event) => store.setBilledAmount(event.currentTarget.value)}
          required
        />

        <label htmlFor="coverage-percentage">Coverage Percentage</label>
        <input
          id="coverage-percentage"
          name="coverage-percentage"
          type="number"
          min="0"
          max="100"
          step="1"
          value={store.coveragePercent}
          onChange={(event) => store.setCoveragePercent(event.currentTarget.value)}
          required
        />

        <button type="submit" disabled={store.isLoading}>
          {store.isLoading ? "Calculating..." : "Estimate Cost"}
        </button>
      </form>

      {store.error && (
        <p className="error" role="alert">
          {store.error}
        </p>
      )}

      {store.planPays !== null && store.memberPays !== null && (
        <div className="result-grid" role="status" aria-live="polite">
          <article className="result-card">
            <h2>Plan Pays</h2>
            <p>{asCurrency(store.planPays)}</p>
          </article>
          <article className="result-card">
            <h2>Member Pays</h2>
            <p>{asCurrency(store.memberPays)}</p>
          </article>
        </div>
      )}
    </section>
  );
});
