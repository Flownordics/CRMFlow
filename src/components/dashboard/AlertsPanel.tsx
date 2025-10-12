import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { useDashboardAlerts } from "@/services/dashboardAlerts";
import { fromMinor, formatNumber } from "@/lib/money";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AlertsPanel() {
  const { data: alerts, isLoading } = useDashboardAlerts();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-card bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-card bg-gradient-to-br from-[#f0f4ec] to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-[#6b7c5e]" />
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-[#6b7c5e]">
            <span>✓</span>
            <span>All clear! No alerts at the moment.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errorAlerts = alerts.filter(a => a.type === 'error');
  const warningAlerts = alerts.filter(a => a.type === 'warning');
  const infoAlerts = alerts.filter(a => a.type === 'info');

  return (
    <Card className="rounded-2xl border shadow-card bg-gradient-to-br from-[#fef2f0]/50 via-[#faf5ef]/50 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-[#b8695f]" />
            Alerts
          </CardTitle>
          <Badge variant="destructive" className="font-semibold status-overdue border">
            {formatNumber(alerts.length)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {/* Error Alerts */}
        {errorAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors cursor-pointer"
            onClick={() => alert.action && navigate(alert.action.href)}
          >
            <div className="flex items-start gap-2 flex-1">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-destructive">
                  {alert.title}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {alert.description}
                  {alert.value !== undefined && alert.currency && (
                    <span className="ml-1 font-medium">
                      ({fromMinor(alert.value, alert.currency)})
                    </span>
                  )}
                </div>
              </div>
            </div>
            {alert.action && (
              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}

        {/* Warning Alerts */}
        {warningAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-2 rounded-lg bg-[#faf5ef] border border-[#e8dac8] hover:bg-[#f5efe5] transition-colors cursor-pointer"
            onClick={() => alert.action && navigate(alert.action.href)}
          >
            <div className="flex items-start gap-2 flex-1">
              <AlertTriangle className="h-4 w-4 text-[#9d855e] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-[#7d6a4a]">
                  {alert.title}
                </div>
                <div className="text-xs text-[#9d855e] mt-0.5 line-clamp-1">
                  {alert.description}
                </div>
              </div>
            </div>
            {alert.action && (
              <ChevronRight className="h-3 w-3 text-[#9d855e] flex-shrink-0" />
            )}
          </div>
        ))}

        {/* Info Alerts */}
        {infoAlerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start justify-between p-2 rounded-lg bg-[#eff4f7] border border-[#d0dfe8] hover:bg-[#e5eff4] transition-colors cursor-pointer"
            onClick={() => alert.action && navigate(alert.action.href)}
          >
            <div className="flex items-start gap-2 flex-1">
              <Info className="h-4 w-4 text-[#5a7b8f] flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-[#4a6b7f]">
                  {alert.title}
                </div>
                <div className="text-xs text-[#5a7b8f] mt-0.5 line-clamp-1">
                  {alert.description}
                </div>
              </div>
            </div>
            {alert.action && (
              <ChevronRight className="h-3 w-3 text-[#5a7b8f] flex-shrink-0" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

