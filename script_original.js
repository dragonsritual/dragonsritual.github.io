document.addEventListener("DOMContentLoaded", () => {
  const ritualSection = document.querySelector("#ritual");
  if (!ritualSection) return;

  const drawBtn = ritualSection.querySelector(".ritual-draw-btn");
  const cardBack = ritualSection.querySelector(".card-back");
  const cardSigil = ritualSection.querySelector(".card-sigil");
  const statusText = ritualSection.querySelector(".ritual-status");

  const orb1 = ritualSection.querySelector(".orb-1");
  const orb2 = ritualSection.querySelector(".orb-2");
  const orb3 = ritualSection.querySelector(".orb-3");

  const ritualCopyList = ritualSection.querySelector(".ritual-copy .mini-list");

  if (
    !drawBtn ||
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
        "A message is already moving toward you. Stop waiting for perfect conditions and begin transmitting with force.",
      tone: "Activation"
    },
    {
      title: "The Forge",
      meaning:
        "What you are building requires repetition, pressure, and return. The system becomes real through continued shaping.",
      tone: "Construction"
    },
    {
      title: "The Warlord",
      meaning:
        "Power without command scatters itself. Name the campaign. Hold the line. Move with decision.",
      tone: "Discipline"
    },
    {
      title: "The Archive",
      meaning:
        "Old work is not dead material. It is stored fire. Review what already exists and turn it into the next structure.",
      tone: "Legacy"
    },
    {
      title: "The Portal",
      meaning:
        "A threshold is already open. Your task is not to ask whether it exists, but whether you are willing to cross it.",
      tone: "Transition"
    },
    {
      title: "The Flame",
      meaning:
        "Momentum returns when action returns. Feed the chamber with movement instead of delay.",
      tone: "Momentum"
    },
    {
      title: "The Chamber",
      meaning:
        "Atmosphere changes meaning. Build spaces that feel entered, not merely viewed.",
      tone: "Atmosphere"
    },
    {
      title: "The Crowned Skull",
      meaning:
        "Time sharpens the ritual. Make the artifact that proves you were here.",
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

    setOrbPosition(orb1, -140, 36, 1);
    setOrbPosition(orb2, 0, 0, 1);
    setOrbPosition(orb3, 140, 36, 1);

    orb1.style.opacity = "0.92";
    orb2.style.opacity = "0.92";
    orb3.style.opacity = "0.92";

    orb1.style.filter = "blur(0.2px)";
    orb2.style.filter = "blur(0.2px)";
    orb3.style.filter = "blur(0.2px)";

    void orb1.offsetWidth;

    orb1.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
    orb2.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
    orb3.style.transition =
      "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease, filter 0.8s ease";
  }

  function setOrb2MidHover() {
    setOrbPosition(orb2, 0, -40, 1.18);
    orb2.style.opacity = "1";
    orb2.style.filter = "blur(0px)";
  }

  function setOrb2CrownHover() {
    setOrbPosition(orb2, 0, -64, 1.22);
  }

  function setOrb2FinalHover() {
    setOrbPosition(orb2, 0, -46, 1.12);
  }

  function animateOrbs() {
    return new Promise((resolve) => {
      resetOrbs();

      statusText.textContent = "Activating ritual arc";

      setTimeout(() => {
        setOrbPosition(orb1, -86, -8, 1.06);
        orb1.style.filter = "blur(0px)";
      }, 60);

      setTimeout(() => {
        setOrb2MidHover();
      }, 300);

      setTimeout(() => {
        setOrbPosition(orb3, 92, -10, 1.06);
        orb3.style.filter = "blur(0px)";
      }, 540);

      setTimeout(() => {
        setOrbPosition(orb1, -28, -50, 1.1);
      }, 840);

      setTimeout(() => {
        setOrbPosition(orb3, 30, -54, 1.1);
      }, 1040);

      setTimeout(() => {
        setOrb2CrownHover();
      }, 1180);

      setTimeout(() => {
        setOrbPosition(orb1, -100, -4, 0.98);
        setOrbPosition(orb3, 100, -4, 0.98);
        orb1.style.opacity = "0.82";
        orb3.style.opacity = "0.82";
      }, 1640);

      setTimeout(() => {
        setOrb2FinalHover();
        statusText.textContent = "Ritual channel open";
        resolve();
      }, 1860);
    });
  }

  function revealCard(card) {
    return new Promise((resolve) => {
      clearExistingReveal();

      cardBack.style.transition =
        "transform 0.95s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.5s ease, filter 0.5s ease";
      cardBack.style.transform = "translateY(-14px) rotateY(180deg) scale(1.02)";
      cardBack.style.boxShadow =
        "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 50px rgba(143, 42, 42, 0.22)";
      cardBack.style.filter = "brightness(1.04)";

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
      "0 0 0 1px rgba(255,255,255,0.035) inset, 0 0 28px rgba(143, 42, 42, 0.16)";
    cardBack.style.filter = "brightness(1)";

    cardSigil.style.transition = "none";
    cardSigil.style.opacity = "1";
  }

  function updateReadingPanel(card) {
    ritualCopyList.innerHTML = `
      <div class="mini-item"><strong>Card:</strong> ${card.title}</div>
      <div class="mini-item"><strong>Tone:</strong> ${card.tone}</div>
      <div class="mini-item"><strong>Reading:</strong> ${card.meaning}</div>
      <div class="mini-item"><strong>Chamber Note:</strong> This draw is part of the evolving DragonsRitual arcana system.</div>
    `;
  }

  async function doSingleDraw() {
    if (isAnimating) return;
    isAnimating = true;

    drawBtn.disabled = true;

    resetCardVisual();
    resetOrbs();

    const card = randomCard();

    statusText.textContent = "Beginning draw";

    await animateOrbs();
    await revealCard(card);

    drawBtn.disabled = false;
    isAnimating = false;
  }

  drawBtn.addEventListener("click", doSingleDraw);

  resetOrbs();
  resetCardVisual();
});
