"use client";

import { useEffect, useState } from "react";

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Ground Signal",
    description:
      "Location intelligence platform. Find the best zones for activations, OOH campaigns, and guerrilla marketing across Berlin and London.",
    highlight: null,
  },
  {
    title: "Choose Your Mode",
    description:
      "Switch between Cultural, Retail, Creator, Guerrilla, and OOH modes. Each mode re-ranks zones based on what matters for that strategy.",
    highlight: "left",
  },
  {
    title: "Toggle Data Layers",
    description:
      "Show or hide galleries, agencies, competitors, OOH surfaces, and more. Scores update dynamically as you toggle layers on and off.",
    highlight: "left",
  },
  {
    title: "Route Planner",
    description:
      "Plan activation corridors by clicking markers on the map. The planner calculates walking distance, travel time, and OOH surfaces along your route.",
    highlight: "right",
  },
  {
    title: "Zone Rankings",
    description:
      "Zones are ranked by score for your selected mode. Click any zone to see detailed breakdowns and generate activation recommendations.",
    highlight: "right",
  },
];

const STORAGE_KEY = "ground-signal-tutorial-seen";

export function Tutorial() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setIsVisible(true);
    }
  }, []);

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSkip();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) {
    return null;
  }

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-backdrop" onClick={handleSkip} />

      {step.highlight === "left" && <div className="tutorial-highlight tutorial-highlight-left" />}
      {step.highlight === "right" && <div className="tutorial-highlight tutorial-highlight-right" />}

      <div className="tutorial-card glass-panel">
        <div className="tutorial-header">
          <span className="tutorial-step-indicator">
            {currentStep + 1} / {TUTORIAL_STEPS.length}
          </span>
          <button className="tutorial-skip-btn" onClick={handleSkip} type="button">
            Skip
          </button>
        </div>

        <h2 className="tutorial-title">{step.title}</h2>
        <p className="tutorial-description">{step.description}</p>

        <div className="tutorial-dots">
          {TUTORIAL_STEPS.map((_, index) => (
            <span
              key={index}
              className={`tutorial-dot ${index === currentStep ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="tutorial-actions">
          {currentStep > 0 ? (
            <button className="tutorial-btn tutorial-btn-secondary" onClick={handlePrevious} type="button">
              Back
            </button>
          ) : (
            <div />
          )}
          <button className="tutorial-btn tutorial-btn-primary" onClick={handleNext} type="button">
            {isLastStep ? "Get Started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
