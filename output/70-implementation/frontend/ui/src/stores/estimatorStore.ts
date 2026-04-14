import { makeAutoObservable, runInAction } from "mobx";
import { calculateEstimate } from "../services/estimateApi";

export class EstimatorStore {
  billedAmount = "1200";
  coveragePercent = "80";
  planPays: number | null = null;
  memberPays: number | null = null;
  isLoading = false;
  error = "";

  constructor() {
    makeAutoObservable(this);
  }

  setBilledAmount(value: string): void {
    this.billedAmount = value;
  }

  setCoveragePercent(value: string): void {
    this.coveragePercent = value;
  }

  get billedAmountNumber(): number {
    return Number(this.billedAmount);
  }

  get coveragePercentNumber(): number {
    return Number(this.coveragePercent);
  }

  get isValid(): boolean {
    return (
      Number.isFinite(this.billedAmountNumber) &&
      this.billedAmountNumber > 0 &&
      Number.isFinite(this.coveragePercentNumber) &&
      this.coveragePercentNumber >= 0 &&
      this.coveragePercentNumber <= 100
    );
  }

  async estimate(): Promise<void> {
    if (!this.isValid) {
      this.error = "Please enter valid values.";
      this.planPays = null;
      this.memberPays = null;
      return;
    }

    this.isLoading = true;
    this.error = "";

    try {
      const result = await calculateEstimate({
        billedAmount: this.billedAmountNumber,
        coveragePercent: this.coveragePercentNumber,
      });

      runInAction(() => {
        this.planPays = result.planPays;
        this.memberPays = result.memberPays;
      });
    } catch (error) {
      runInAction(() => {
        this.error = error instanceof Error ? error.message : "Unexpected error";
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  }
}
