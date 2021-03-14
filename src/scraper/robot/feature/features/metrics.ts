import { RootScopeContext } from "../../scope/root-scope-context";
import { ScopeContext } from "../../scope/scope-context";
import { scope } from "../../util/global";
import { Feature } from "../feature-class";

export class MetricsFeature extends Feature {
  onRootScopeEnter(scope: RootScopeContext) {
    this.initialize();
  }

  onScopeEnter(scope: ScopeContext) {
    this.initialize();
  }

  onScopeError(scope: ScopeContext, source: ScopeContext, error: Error) {
    this.finalizeStats();
  }

  onScopeExit(scope: ScopeContext) {
    this.finalizeStats();
  }

  private initialize() {
    const metricsInstance: ScopeMetricsInstance = {
      startTime: new Date(),
    };
    this.scopeMetrics.value = metricsInstance;

    const generalMetrics = this.generalScopeTotalTimes.value!;

    let thisScopeMetrics = generalMetrics[scope.fullName];
    if (!thisScopeMetrics) {
      thisScopeMetrics = {
        instances: [],
      };
      generalMetrics[scope.fullName] = thisScopeMetrics;
    }

    thisScopeMetrics.instances.push(metricsInstance);
  }

  private finalizeStats() {
    const metrics = this.scopeMetrics.value!;

    metrics.endTime = new Date();
    metrics.totalTime = metrics.endTime.getTime() - metrics.startTime.getTime();

    this.prepareReport();
  }

  private prepareReport() {
    const scopes: Record<string, MetricsReportScope> = {};

    for (const [scopeName, scopeMetrics] of Object.entries(
      this.generalScopeTotalTimes.value!
    )) {
      const finishedScopes = scopeMetrics.instances.filter(
        (instance) => instance.totalTime !== undefined
      );
      const finishedSorted = finishedScopes.sort((a, b) =>
        a.totalTime! > b.totalTime! ? 1 : -1
      );

      if (finishedScopes.length) {
        scopes[scopeName] = {
          timing: {
            min: finishedSorted[0].totalTime!,
            max: finishedSorted[finishedSorted.length - 1].totalTime!,
            average: finishedSorted.reduce((a, b) => a + b.totalTime!, 0) / finishedSorted.length,
          },
          executions: scopeMetrics.instances.length,
        };
      }
    }

    const report: MetricsReport = {
      scopes,
    };

    this.scopeMetricsReport.value = report;
  }

  scopeMetrics = this.createLocalScopeVariable<ScopeMetricsInstance>(
    "ScopeMetrics"
  );

  generalScopeTotalTimes = this.createScopeRootVariable<{
    [scope: string]: GeneralScopeMetrics;
  }>("GeneralScopeTotalTimes", () => ({}));

  scopeMetricsReport = this.createOutputVariable<MetricsReport>(
    "ScopeMetricsReport",
    () => ({ scopes: {} })
  );
}

interface GeneralScopeMetrics {
  instances: ScopeMetricsInstance[];
}

interface ScopeMetricsInstance {
  startTime: Date;
  endTime?: Date;
  totalTime?: number;
}

interface MetricsReport {
  scopes: Record<string, MetricsReportScope>;
}

interface MetricsReportScope {
  executions: number;
  timing: {
    min: number;
    max: number;
    average: number;
  };
}
