document.addEventListener("DOMContentLoaded", () => {
  const ritualSection = document.querySelector("#ritual");
  if (!ritualSection) return;

  const drawBtn = ritualSection.querySelector(".ritual-btn");
  const spreadBtn = ritualSection.querySelectorAll(".ritual-btn")[1];

  const ritualStage = ritualSection.querySelector(".ritual-stage");
  const cardBack = ritualSection.querySelector(".card-back");
  const cardSigil = ritualSection.querySelector(".card-sigil");
  const statusText = ritualSection.querySelector(".ritual-status");

  const orb1 = ritualSection.querySelector(".orb-1");
  const orb2 = ritualSection.querySelector(".orb-2");
  const orb3 = ritualSection.querySelector(".orb-3");

  const ritualCopyList = ritualSection.querySelector(".ritual-copy .mini-list");

  if (
    !drawBtn ||
    !spreadBtn ||
    !ritualStage ||
    !cardBack ||
    !cardSigil ||
    !statusText ||
    !orb1 ||
    !orb2 ||
    !orb3 ||
    !ritualCopyList
  ) {
    return;
  }

  const ritualCards = [
    {
      title: "The Signal",
      meaning:
        "A message is already trying to reach you. Stop waiting for perfect certainty and begin transmitting.",
      tone: "Activation"
    },
    {
      title: "The Forge",
      meaning:
        "Your work becomes real through repetition. Build the system piece by piece and let the identity harden through motion.",
      tone: "Construction"
    },
    {
      title: "The Warlord",
      meaning:
        "Power without direction becomes noise. Choose the campaign, define the lane, and move forward with command.",
      tone: "Discipline"
    },
    {
      title: "The Archive",
      meaning:
        "What you made before still has value. Old signals become proof, lore, and material for the next era.",
      tone: "Legacy"
    },
    {
      title: "The Portal",
      meaning:
        "A threshold is open. What matters now is not whether the world is ready, but whether you are willing to step through it.",
      tone: "Transition"
    },
    {
      title: "The Flame",
      meaning:
        "Your energy returns when the mission becomes visible again. Feed the fire with action, not overthinking.",
      tone: "Momentum"
    },
    {
      title: "The Chamber",
      meaning:
        "Privacy, ritual, and atmosphere matter. Build environments that make people feel they have entered somewhere sacred.",
      tone: "Atmosphere"
    },
    {
      title: "The Crowned Skull",
      meaning:
        "Mortality sharpens intention. Make the thing that proves you were here.",
      tone: "Intensity"
    }
  ];

  let isAnimating = false;
  let activeCardFace = null;

  function randomCard() {
    const index = Math.floor(Math.random() * ritualCards.length);
    return ritualCards[index];
  }

  function clearExistingReveal() {
    if (activeCardFace && activeCardFace.parentNode) {
      activeCardFace.parentNode.removeChild(activeCardFace);
      activeCardFace = null;
    }
  }

  function resetOrbTransitions() {
    [orb1, orb2, orb3].forEach((orb) => {
      orb.style.transition = "none";
    });
  }

  function setOrbPosition(orb, x, y, scale = 1) {
    orb.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function resetOrbs() {
    resetOrbTransitions();
    setOrbPosition(orb1, -150, 40, 1);
    setOrbPosition(orb2, 0, 0, 1);
    setOrbPosition(orb3, 150, 40, 1);

    orb1.style.opacity = "0.92";
    orb2.style.opacity = "0.92";
    orb3.style.opacity = "0.92";

    orb1.style.filter = "blur(0.2px)";
    orb2.style.filter = "blur(0.2px)";
    orb3.style.filter = "blur(0.2px)";

    // Force reflow so transition reset actually sticks
    void orb1.offsetWidth;

    orb1.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
    orb2.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
    orb3.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
  }

  function animateOrbs() {
    return new Promise((resolve) => {
      resetOrbs();

      statusText.textContent = "Activating ritual arc";

      setTimeout(() => {
        setOrbPosition(orb1, -90, -10, 1.08);
        orb1.style.filter = "blur(0px)";
      }, 50);

      setTimeout(() => {
        setOrb2MidHover();
      }, 280);

      setTimeout(() => {
        setOrbPosition(orb3, 95, -12, 1.08);
        orb3.style.filter = "blur(0px)";
      }, 520);

      setTimeout(() => {
        setOrbPosition(orb1, -28, -54, 1.12);
      }, 820);

      setTimeout(() => {
        setOrbPosition(orb3, 34, -58, 1.12);
      }, 1020);

      setTimeout(() => {
        setOrb2CrownHover();
      }, 1180);

      setTimeout(() => {
        setOrbPosition(orb1, -108, -6, 0.98);
        setOrbPosition(orb3, 108, -6, 0.98);
        orb1.style.opacity = "0.82";
        orb3.style.opacity = "0.82";
      }, 1680);

      setTimeout(() => {
        setOrb2FinalHover();
        statusText.textContent = "Ritual channel open";
        resolve();
      }, 1880);
    });
  }

  function setOrb2MidHover() {
    setOrbPosition(orb2, 0, -42, 1.18);
    orb2.style.opacity = "1";
    orb2.style.filter = "blur(0px)";
  }

  function setOrb2CrownHover() {
    setOrbPosition(orb2, 0, -68, 1.22);
  }

  function setOrb2FinalHover() {
    setOrbPosition(orb2, 0, -48, 1.14);
  }

  function revealCard(card) {
    return new Promise((resolve) => {
      clearExistingReveal();

      cardBack.style.transition =
        "transform 0.95s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s ease, filter 0.5s ease";
      cardBack.style.transform = "translateY(-16px) rotateY(180deg) scale(1.02)";
      cardBack.style.boxShadow =
        "0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 60px rgba(127,108,255,0.24)";
      cardBack.style.filter = "brightness(1.05)";

      cardSigil.style.transition = "opacity 0.25s ease";
      cardSigil.style.opacity = "0";

      setTimeout(() => {
        const cardFace = document.createElement("div");
        cardFace.className = "card-face-reveal";
        cardFace.innerHTML = `
          <div class="card-face-inner">
            <div class="card-face-eyebrow">${card.tone}</div>
            <h4>${card.title}</h4>
            <p>${card.meaning}</p>
          </div>
        `;

        activeCardFace = cardFace;
        cardBack.appendChild(cardFace);

        requestAnimationFrame(() => {
          cardFace.classList.add("visible");
        });

        statusText.textContent = `Revealed: ${card.title}`;
        updateReadingPanel(card);

        resolve();
      }, 520);
    });
  }

  function resetCardVisual() {
    clearExistingReveal();
    cardBack.style.transition = "none";
    cardBack.style.transform = "translateY(0) rotateY(0deg) scale(1)";
    cardBack.style.boxShadow =
      "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 40px rgba(127,108,255,0.12)";
    cardBack.style.filter = "brightness(1)";
    cardSigil.style.transition = "none";
    cardSigil.style.opacity = "1";
  }

  function updateReadingPanel(card) {
    ritualCopyList.innerHTML = `
      <div class="mini-item"><strong>Card:</strong> ${card.title}</div>
      <div class="mini-item"><strong>Tone:</strong> ${card.tone}</div>
      <div class="mini-item"><strong>Reading:</strong> ${card.meaning}</div>
      <div class="mini-item"><strong>Signal:</strong> This ritual pull is part of the evolving DragonsRitual chamber system.</div>
    `;
  }

  async function doSingleDraw() {
    if (isAnimating) return;
    isAnimating = true;

    drawBtn.disabled = true;
    spreadBtn.disabled = true;

    resetCardVisual();
    resetOrbs();

    const card = randomCard();

    statusText.textContent = "Beginning draw";

    await animateOrbs();
    await revealCard(card);

    drawBtn.disabled = false;
    spreadBtn.disabled = false;
    isAnimating = false;
  }

  function doThreeCardPlaceholder() {
    if (isAnimating) return;

    statusText.textContent = "Three card spread coming next phase";

    ritualCopyList.innerHTML = `
      <div class="mini-item"><strong>Three Card Spread:</strong> This button is reserved for the next upgrade.</div>
      <div class="mini-item">Next phase will add Past / Present / Future or Mind / Body / Signal layout.</div>
      <div class="mini-item">The same orb ritual will activate across three reveal zones.</div>
      <div class="mini-item">For now, use <strong>Draw a Card</strong> to test the ritual chamber.</div>
    `;
  }

  drawBtn.addEventListener("click", doSingleDraw);
  spreadBtn.addEventListener("click", doThreeCardPlaceholder);

  resetOrbs();
  resetCardVisual();
});
