import React, { useState, useContext, useCallback } from 'react';
import { AppContext } from '../../context/AppContext.jsx';
import AlertBar from './AlertBar.jsx';
import { useEvents } from './hooks/useEvents.js';
import { useActions } from './hooks/useActions.js';

import OverviewView from './views/OverviewView.jsx';
import ClinicsView from './views/ClinicsView.jsx';
import TrialsView from './views/TrialsView.jsx';
import AutomationsView from './views/AutomationsView.jsx';
import AnalyticsView from './views/AnalyticsView.jsx';
import MonitoringView from './views/MonitoringView.jsx';
import IncidentsView from './views/IncidentsView.jsx';
import LogsView from './views/LogsView.jsx';
import BillingView from './views/BillingView.jsx';
import SettingsView from './views/SettingsView.jsx';

const VIEWS = {
  dashboard: OverviewView,
  overview: OverviewView,
  clinics: ClinicsView,
  trials: TrialsView,
  automations: AutomationsView,
  analytics: AnalyticsView,
  monitoring: MonitoringView,
  incidents: IncidentsView,
  logs: LogsView,
  billing: BillingView,
  settings: SettingsView,
};

export default function OperatorApp() {
  const ctx = useContext(AppContext);
  const tab = ctx?.opSubTab || 'dashboard';

  const [selectedClinic, setSelectedClinic] = useState(null);
  const eventState = useEvents();
  const actionState = useActions();

  const View = VIEWS[tab] || OverviewView;

  // Navigation helper — lets any view switch tabs
  const navigateTo = useCallback((targetTab, clinic) => {
    if (clinic) setSelectedClinic(clinic);
    else setSelectedClinic(null);
    ctx?.setOpSubTab?.(targetTab);
  }, [ctx]);

  // Clear selected clinic when tab changes
  const prevTabRef = React.useRef(tab);
  if (prevTabRef.current !== tab) {
    prevTabRef.current = tab;
    if (selectedClinic) setSelectedClinic(null);
  }

  const viewProps = { events: eventState, actions: actionState, navigateTo };
  if (tab === 'clinics') {
    viewProps.selectedClinic = selectedClinic;
    viewProps.onSelectClinic = setSelectedClinic;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', flex: 1 }}>
      <AlertBar
        events={eventState.events}
        criticalCount={eventState.criticalCount}
        unresolvedCount={eventState.unresolvedCount}
        connected={eventState.connected}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <View {...viewProps} />
      </div>
    </div>
  );
}
