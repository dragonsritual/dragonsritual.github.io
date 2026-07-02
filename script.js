const inputs = document.querySelectorAll(".letter-row input");

inputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value = input.value.toUpperCase();

    if (input.value && inputs[index + 1]) {
      inputs[index + 1].focus();
    }

    updateHiddenWord();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
      inputs[index - 1].focus();
    }
  });
});

function updateHiddenWord() {
  const highlightedInputs = document.querySelectorAll(".letter-row input.highlight");
  let word = "";

  highlightedInputs.forEach((input) => {
    word += input.value ? input.value.toUpperCase() : "_";
  });

  document.getElementById("hiddenWord").textContent = word;
}

document.getElementById("checkPuzzle").addEventListener("click", () => {
  const rows = document.querySelectorAll(".letter-row");
  let allCorrect = true;

  rows.forEach((row) => {
    const answer = row.dataset.answer.toUpperCase();
    const rowInputs = row.querySelectorAll("input");
    let typed = "";

    rowInputs.forEach((input) => {
      typed += input.value.toUpperCase();
    });

    if (typed !== answer) {
      allCorrect = false;
      row.classList.add("wrong");
    } else {
      row.classList.remove("wrong");
    }
  });

  const result = document.getElementById("puzzleResult");

  if (allCorrect) {
    result.textContent = "Correct. The relic page has opened.";
  } else {
    result.textContent = "Not yet. Check the missing letters and try again.";
  }

  updateHiddenWord();
});
