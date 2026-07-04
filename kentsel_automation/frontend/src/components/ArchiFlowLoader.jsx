import { ArchiFlowLogo } from "./ArchiFlowLogo.jsx";

export function ArchiFlowLoader() {
  return (
    <div className="archiflow-loader">
      <div className="archiflow-drafting-grid" aria-hidden="true" />
      <div className="archiflow-loader-shell">
        <div className="archiflow-loader-topline" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="archiflow-loader-meta" aria-hidden="true">
          <span>AF / CORE</span>
          <span>ONLINE</span>
        </div>
        <div className="archiflow-mark-wrap" aria-hidden="true">
          <span className="archiflow-orbit archiflow-orbit-outer" />
          <span className="archiflow-orbit archiflow-orbit-inner" />
          <span className="archiflow-scanline" />
          <span className="archiflow-corner archiflow-corner-tl" />
          <span className="archiflow-corner archiflow-corner-tr" />
          <span className="archiflow-corner archiflow-corner-bl" />
          <span className="archiflow-corner archiflow-corner-br" />
          <div className="archiflow-mark-frame">
            <ArchiFlowLogo className="archiflow-mark" />
          </div>
        </div>
        <div className="archiflow-loader-copy">
          <div className="archiflow-loader-title">ArchiFlow</div>
          <div className="archiflow-loader-subtitle">project intelligence is loading</div>
        </div>
        <div className="archiflow-loader-track">
          <span />
        </div>
        <div className="archiflow-loader-meter" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="archiflow-loader-status" aria-hidden="true">
          <span />
          <span>initializing</span>
        </div>
      </div>
    </div>
  );
}
