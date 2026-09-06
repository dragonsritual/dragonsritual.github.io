window.GameUI = {
  setMessage(message) {
    const element =
      document.getElementById(
        "battleMessage"
      );

    if (element) {
      element.textContent = message;
    }
  },

  writeLog(message) {
    const element =
      document.getElementById(
        "battleLog"
      );

    if (element) {
      element.textContent = message;
    }
  },

  setPlanningStatus(message) {
    const element =
      document.getElementById(
        "planningStatusText"
      );

    if (element) {
      element.textContent = message;
    }
  },

  showActionPhase() {
    return new Promise(resolve => {
      const banner =
        document.getElementById(
          "actionPhaseBanner"
        );

      const battlefield =
        document.getElementById(
          "battlefield"
        );

      banner.classList.remove("hidden");

      battlefield.classList.add(
        "action-phase-active"
      );

      void banner.offsetWidth;

      banner.classList.add("show");

      setTimeout(() => {
        banner.classList.remove("show");

        setTimeout(() => {
          banner.classList.add("hidden");
          resolve();
        }, 260);
      }, 760);
    });
  },

  startActionResolution(
    actorName,
    actionName,
    duration
  ) {
    const panel =
      document.getElementById(
        "actionResolutionPanel"
      );

    const actorText =
      document.getElementById(
        "actionActorText"
      );

    const actionText =
      document.getElementById(
        "actionNameText"
      );

    const fill =
      document.getElementById(
        "actionProgressFill"
      );

    actorText.textContent = actorName;
    actionText.textContent = actionName;

    panel.classList.remove("hidden");

    fill.style.transition = "none";
    fill.style.width = "100%";

    void fill.offsetWidth;

    fill.style.transition =
      `width ${duration}ms linear`;

    fill.style.width = "0%";
  },

  markImpact() {
    const panel =
      document.getElementById(
        "actionResolutionPanel"
      );

    panel.classList.remove(
      "impact-flash"
    );

    void panel.offsetWidth;

    panel.classList.add(
      "impact-flash"
    );

    setTimeout(() => {
      panel.classList.remove(
        "impact-flash"
      );
    }, 220);
  },

  hideActionResolution() {
    const panel =
      document.getElementById(
        "actionResolutionPanel"
      );

    panel.classList.add("hidden");
  },

  finishActionPhase() {
    const battlefield =
      document.getElementById(
        "battlefield"
      );

    battlefield.classList.remove(
      "action-phase-active"
    );

    this.hideActionResolution();
  },

  updateCommandPanel(
    fighter,
    readyToExecute,
    waitingForTarget
  ) {
    const attackButton =
      document.getElementById(
        "attackButton"
      );

    const skillButton =
      document.getElementById(
        "skillButton"
      );

    const guardButton =
      document.getElementById(
        "guardButton"
      );

    const executeButton =
      document.getElementById(
        "executeTurnButton"
      );

    const isPlanning =
      !!fighter &&
      !readyToExecute &&
      !window.GameBattle.runningTurn;

    attackButton.disabled =
      !isPlanning ||
      waitingForTarget;

    skillButton.disabled =
      !isPlanning ||
      waitingForTarget;

    guardButton.disabled =
      !isPlanning ||
      waitingForTarget;

    executeButton.disabled =
      !readyToExecute ||
      window.GameBattle.runningTurn;

    skillButton.textContent =
      fighter?.skillName
        ? fighter.skillName.toUpperCase()
        : "SKILL";
  }
};
