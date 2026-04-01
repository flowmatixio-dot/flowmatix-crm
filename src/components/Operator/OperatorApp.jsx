import React, { useState } from 'react';
import OperatorSidebar from './OperatorSidebar.jsx';
import AlertBar from './AlertBar.jsx';
import { useEvents } from './hooks/useEvents.js';
import { useActions } from './hooks/useActions.js';

// Lazy-load views
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
  const [tab, setTab] = useState('overview');
  const [selectedClinic, setSelectedClinic] = useState(null);
  const eventState = useEvents();
  const actionState = useActions();

  const View = VIEWS[tab] || OverviewView;

  const badges = {
    overview: eventState.criticalCount || 0,
    clinics: actionState.actionRequired.length || 0,
    incidents: eventState.events.filter(e => e.type === 'ERROR_OCCURRED' && !e.resolved).length || 0,
  };

  // When switching tabs, clear selected clinic
  const handleTabChange = (newTab) => {
    setSelectedClinic(null);
    setTab(newTab);
  };

  // Build props for the active view
  const viewProps = { events: eventState, actions: actionState };
  if (tab === 'clinics') {
    viewProps.selectedClinic = selectedClinic;
    viewProps.onSelectClinic = setSelectedClinic;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: 'var(--text-primary)', overflow: 'hidden' }}>
      <OperatorSidebar activeTab={tab} onTabChange={handleTabChange} badges={badges} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
    </div>
  );
}
