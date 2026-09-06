window.Game = {
  initialize() {
    window.GameInput.initialize();
    window.GameRenderer.initialize();
    window.GameBattle.start();
  }
};