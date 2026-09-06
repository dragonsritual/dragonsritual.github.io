window.GameInput = {
  initialize() {
    document
      .querySelectorAll(
        "[data-action]"
      )
      .forEach(button => {
        button.addEventListener(
          "click",
          () => {
            window.GameBattle.chooseAction(
              button.dataset.action
            );
          }
        );
      });

    document
      .getElementById(
        "executeTurnButton"
      )
      .addEventListener(
        "click",
        () => {
          window.GameBattle.executeTurn();
        }
      );

    document
      .getElementById(
        "restartButton"
      )
      .addEventListener(
        "click",
        () => {
          window.GameBattle.restart();
        }
      );

    document
      .getElementById(
        "battlefield"
      )
      .addEventListener(
        "click",
        event => {
          const combatant =
            event.target.closest(
              ".combatant"
            );

          if (!combatant) {
            return;
          }

          const id=combatant.dataset.combatantId;
          const unit=window.GameBattle.findUnit(id);

          if(
            unit?.team==="fighter" &&
            !window.GameBattle.waitingForTarget &&
            !window.GameBattle.runningTurn
          ){
            window.GameRenderer.showInspect(unit);
            return;
          }

          window.GameBattle.selectCombatant(id);
        }
      );

    document.getElementById("inspectCloseButton")?.addEventListener("click",()=>window.GameRenderer.hideInspect());
    document.getElementById("collectionButton")?.addEventListener("click",()=>window.GameRenderer.showCollection());
    document.getElementById("collectionCloseButton")?.addEventListener("click",()=>window.GameRenderer.hideCollection());

    window.addEventListener(
      "keydown",
      event => {
        if (
          window.GameBattle.choosingUpgrade &&
          ["1", "2", "3"].includes(event.key)
        ) {
          window.GameBattle.chooseUpgrade(
            Number(event.key) - 1
          );
          return;
        }

        if (event.key === "1") {
          window.GameBattle.chooseAction(
            "attack"
          );
        }

        if (event.key === "2") {
          window.GameBattle.chooseAction(
            "skill"
          );
        }

        if (event.key === "3") {
          window.GameBattle.chooseAction(
            "guard"
          );
        }

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          window.GameBattle.executeTurn();
        }
      }
    );
  }
};
