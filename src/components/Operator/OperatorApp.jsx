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
import OutreachView from './views/OutreachView.jsx';

const VIEWS = {
  dashboard: OverviewView,
  overview: OverviewView,
  clinics: ClinicsView,
  trials: TrialsView,
  automations: AutomationsView,
  analytics: AnalyticsView,
  monitoring: MonitoringView,
  incidents: IncidentsView,
  outreach: OutreachView,
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
  const skipClearRef = React.useRef(false);
  const navigateTo = useCallback((targetTab, clinic) => {
    if (clinic) { setSelectedClinic(clinic); skipClearRef.current = true; }
    else setSelectedClinic(null);
    ctx?.setOpSubTab?.(targetTab);
  }, [ctx]);

  // Clear selected clinic when tab changes — unless navigateTo set it
  const prevTabRef = React.useRef(tab);
  if (prevTabRef.current !== tab) {
    prevTabRef.current = tab;
    if (skipClearRef.current) { skipClearRef.current = false; }
    else if (selectedClinic) setSelectedClinic(null);
  }

  const viewProps = { events: eventState, actions: actionState, navigateTo, onRefresh: actionState.reload };
  if (tab === 'clinics') {
    viewProps.selectedClinic = selectedClinic;
    viewProps.onSelectClinic = setSelectedClinic;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <AlertBar
        events={eventState.events}
        criticalCount={eventState.criticalCount}
        unresolvedCount={eventState.unresolvedCount}
        connected={eventState.connected}
        onEventClick={(ev) => { if (ev.organization_id) navigateTo('clinics', { id: ev.organization_id, name: ev.org_name }); }}
        onDismiss={(id) => eventState.resolveEvent(id)}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, paddingBottom: 80 }}>
        <View {...viewProps} />
      </div>
    </div>
  );
}
