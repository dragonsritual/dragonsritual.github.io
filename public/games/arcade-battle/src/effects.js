window.GameEffects = {
  showDamage(combatantId, damage) {
    const target =
      document.querySelector(
        `[data-combatant-id="${combatantId}"]`
      );

    const battlefield =
      document.getElementById(
        "battlefield"
      );

    const effectsLayer =
      document.getElementById(
        "effectsLayer"
      );

    if (
      !target ||
      !battlefield ||
      !effectsLayer
    ) {
      return;
    }

    const targetRect =
      target.getBoundingClientRect();

    const fieldRect =
      battlefield.getBoundingClientRect();

    const damageElement =
      document.createElement("div");

    damageElement.className =
      "floating-damage";

    damageElement.textContent =
      `-${damage}`;

    damageElement.style.left =
      `${
        targetRect.left -
        fieldRect.left +
        targetRect.width / 2
      }px`;

    damageElement.style.top =
      `${
        targetRect.top -
        fieldRect.top +
        10
      }px`;

    effectsLayer.appendChild(
      damageElement
    );

    setTimeout(() => {
      damageElement.remove();
    }, 800);
  },

  playEffect(effect, targetId) {
    if (!effect) return;

    const target =
      document.querySelector(
        `[data-combatant-id="${targetId}"]`
      );

    const battlefield =
      document.getElementById(
        "battlefield"
      );

    const effectsLayer =
      document.getElementById(
        "effectsLayer"
      );

    if (
      !target ||
      !battlefield ||
      !effectsLayer
    ) {
      return;
    }

    const targetRect =
      target.getBoundingClientRect();

    const fieldRect =
      battlefield.getBoundingClientRect();

    const effectImage =
      document.createElement("img");

    effectImage.className =
      "battle-effect-image";

    effectImage.draggable = false;

    effectImage.style.left =
      `${
        targetRect.left -
        fieldRect.left +
        targetRect.width / 2
      }px`;

    effectImage.style.top =
      `${
        targetRect.top -
        fieldRect.top +
        targetRect.height / 2
      }px`;

    effectsLayer.appendChild(
      effectImage
    );

    let frame = 1;

    const setFrame = () => {
      const padded =
        String(frame).padStart(2, "0");

      effectImage.src =
        `${effect.folder}/${effect.prefix}${padded}.png`;
    };

    setFrame();

    const timer = setInterval(() => {
      frame += 1;

      if (frame > effect.frames) {
        clearInterval(timer);
        effectImage.remove();
        return;
      }

      setFrame();
    }, 100);
  }
};