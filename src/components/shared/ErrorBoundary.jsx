import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    const t = this.props.t || (k => k);
    if (this.state.hasError) {
      return <div style={{
        padding: 40, textAlign: "center", maxWidth: 500, margin: "80px auto",
        borderRadius: 20, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)"
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: "#ef4444" }}>{t("something_went_wrong")}</div>
        <div style={{ fontSize: 14, color: "rgba(167,177,195,0.6)", marginBottom: 20, lineHeight: 1.5 }}>
          {this.state.error?.message || t("unexpected_error")}
          <pre style={{ fontSize: 10, color: "rgba(167,177,195,0.4)", textAlign: "left", marginTop: 8, maxHeight: 100, overflow: "auto", whiteSpace: "pre-wrap" }}>{this.state.error?.stack}</pre>
        </div>
        <button onClick={() => { this.setState({ hasError: false, error: null }); }} style={{
          padding: "10px 24px", borderRadius: 12, background: "rgba(76,201,255,0.08)",
          border: "1px solid rgba(76,201,255,0.2)", color: "#4cc9ff",
          fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginRight: 8
        }}>{t("try_again")}</button>
        <button onClick={() => window.location.reload()} style={{
          padding: "10px 24px", borderRadius: 12, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", color: "rgba(167,177,195,0.6)",
          fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit"
        }}>{t("reload_page")}</button>
      </div>;
    }
    return this.props.children;
  }
}
