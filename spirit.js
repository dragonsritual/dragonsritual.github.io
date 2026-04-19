document.addEventListener("DOMContentLoaded", () => {
  const drawBtn = document.querySelector(".spirit-draw-btn");
  const statusText = document.querySelector(".spirit-status");
  const display = document.querySelector(".spirit-card-display");

  const orb1 = document.querySelector(".spirit-orb-1");
  const orb2 = document.querySelector(".spirit-orb-2");
  const orb3 = document.querySelector(".spirit-orb-3");

  if (!drawBtn || !statusText || !display || !orb1 || !orb2 || !orb3) return;

  const majorArcana = [
    {
      title: "The Fool",
      keyword: "Beginning",
      text: "A threshold opens. Step forward with trust, even if the full road is not yet visible."
    },
    {
      title: "The Magician",
      keyword: "Power",
      text: "Will, skill, and direction align. What you need is already closer than you think."
    },
    {
      title: "The High Priestess",
      keyword: "Mystery",
      text: "The deeper truth is quiet, not absent. Listen before acting."
    },
    {
      title: "The Empress",
      keyword: "Growth",
      text: "Creation wants form. Feed what is living and let it multiply."
    },
    {
      title: "The Emperor",
      keyword: "Structure",
      text: "Command the field. Shape the chaos with intention and order."
    },
    {
      title: "The Hierophant",
      keyword: "Teaching",
      text: "There is wisdom in systems, lineages, and sacred patterns. Study the form."
    },
    {
      title: "The Lovers",
      keyword: "Alignment",
      text: "Choice and devotion meet here. What you bind yourself to matters."
    },
    {
      title: "The Chariot",
      keyword: "Momentum",
      text: "Forward motion is available now. Hold the reins and move with purpose."
    },
    {
      title: "Strength",
      keyword: "Inner Force",
      text: "Gentle control can outlast brute force. Power can be calm."
    },
    {
      title: "The Hermit",
      keyword: "Withdrawal",
      text: "Step back from noise. The next answer arrives in solitude."
    },
    {
      title: "Wheel of Fortune",
      keyword: "Shift",
      text: "The pattern is turning. Be ready to move when the cycle opens."
    },
    {
      title: "Justice",
      keyword: "Truth",
      text: "Clarity cuts through confusion. What is real must be faced directly."
    },
    {
      title: "The Hanged Man",
      keyword: "Pause",
      text: "Do not force movement. The change comes through surrender and new sight."
    },
    {
      title: "Death",
      keyword: "Transformation",
      text: "Something must end so something stronger can begin."
    },
    {
      title: "Temperance",
      keyword: "Balance",
      text: "Blend opposites slowly. Harmony is crafted, not stumbled into."
    },
    {
      title: "The Devil",
      keyword: "Attachment",
      text: "Look closely at what holds you. Some chains remain only because they are fed."
    },
    {
      title: "The Tower",
      keyword: "Collapse",
      text: "A false structure breaks. Let the ruin reveal what is still true."
    },
    {
      title: "The Star",
      keyword: "Hope",
      text: "A brighter signal survives the dark. Follow the clean light."
    },
    {
      title: "The Moon",
      keyword: "Illusion",
      text: "Not everything seen clearly is true, and not everything hidden is danger."
    },
    {
      title: "The Sun",
      keyword: "Revelation",
      text: "Energy returns. What was dim begins to burn openly again."
    },
    {
      title: "Judgement",
      keyword: "Awakening",
      text: "A call is sounding. You are being asked to rise into a clearer version of yourself."
    },
    {
      title: "The World",
      keyword: "Completion",
      text: "A cycle closes with meaning. What has been built now becomes whole."
    }
  ];

  let isDrawing = false;
  let fadeTimeout = null;

  function randomCard() {
    return majorArcana[Math.floor(Math.random() * majorArcana.length)];
  }

  function setOrb(orb, x, y, scale, opacity) {
    orb.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    orb.style.opacity = opacity;
  }

  function resetOrbs() {
    [orb1, orb2, orb3].forEach((orb) => {
      orb.style.transition = "none";
      orb.style.opacity = "0";
      orb.style.transform = "translate(0px, 0px) scale(0.9)";
    });

    void orb1.offsetWidth;

    [orb1, orb2, orb3].forEach((orb) => {
      orb.style.transition =
        "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 1s ease";
    });

    setOrb(orb1, -110, 44, 0.9, 0);
    setOrb(orb2, 0, 44, 0.9, 0);
    setOrb(orb3, 110, 44, 0.9, 0);
  }

  function animateOrbs() {
    return new Promise((resolve) => {
      resetOrbs();
      statusText.textContent = "Arcana stirring";

      setTimeout(() => {
        setOrb(orb1, -82, -8, 1.05, 1);
      }, 60);

      setTimeout(() => {
        setOrb(orb2, 0, -42, 1.1, 1);
      }, 320);

      setTimeout(() => {
        setOrb(orb3, 82, -8, 1.05, 1);
      }, 560);

      setTimeout(() => {
        setOrb(orb1, -40, -58, 1.08, 1);
      }, 960);

      setTimeout(() => {
        setOrb(orb3, 40, -58, 1.08, 1);
      }, 1180);

      setTimeout(() => {
        statusText.textContent = "Arc active";
        resolve();
      }, 1480);
    });
  }

  function fadeOrbsSlow() {
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
    }

    fadeTimeout = setTimeout(() => {
      [orb1, orb2, orb3].forEach((orb) => {
        orb.style.opacity = "0";
      });
      statusText.textContent = "Dormant / awaiting draw";
    }, 4200);
  }

  function showCard(card) {
    display.innerHTML = `
      <div class="spirit-card-eyebrow">${card.keyword}</div>
      <h3 class="spirit-card-title">${card.title}</h3>
      <p class="spirit-card-text">${card.text}</p>
    `;
  }

  async function doDraw() {
    if (isDrawing) return;
    isDrawing = true;

    drawBtn.disabled = true;
    drawBtn.textContent = "Drawing...";

    const card = randomCard();

    await animateOrbs();
    showCard(card);
    fadeOrbsSlow();

    drawBtn.disabled = false;
    drawBtn.textContent = "Draw a Card";
    isDrawing = false;
  }

  drawBtn.addEventListener("click", doDraw);

  resetOrbs();
});
