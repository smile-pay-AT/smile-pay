import React, { useEffect, useState } from "react";

const STAGES = {
  idle: "idle",
  scanning: "scanning",
  verified: "verified"
};

export default function LivenessScan({ onVerified, totalFormatted }) {
  const [stage, setStage] = useState(STAGES.idle);

  useEffect(() => {
    if (stage !== STAGES.scanning) return;
    const timeout = setTimeout(() => {
      setStage(STAGES.verified);
      onVerified();
    }, 1800);
    return () => clearTimeout(timeout);
  }, [stage, onVerified]);

  return (
    <div className="liveness" role="group" aria-label="Face verification">
      <p className="liveness__prompt">
        {stage === STAGES.idle && `Confirm ${totalFormatted} with face verification`}
        {stage === STAGES.scanning && "Hold still — blink to confirm"}
        {stage === STAGES.verified && "Verified"}
      </p>

      <div className={`liveness__stage liveness__stage--${stage}`}>
        <div className="liveness__oval">
          <div className="liveness__ring" aria-hidden="true" />
          <span className="liveness__face" aria-hidden="true">
            {stage === STAGES.verified ? "🙂" : "•"}
          </span>
        </div>
      </div>

      {stage === STAGES.idle && (
        <button
          className="liveness__button"
          onClick={() => setStage(STAGES.scanning)}
        >
          Start face verification
        </button>
      )}

      {stage === STAGES.verified && (
        <p className="liveness__note">
          Simulated for this demo — not a real biometric check.
        </p>
      )}
    </div>
  );
}
