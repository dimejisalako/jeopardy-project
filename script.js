const API_URL = "https://rithm-jeopardy.herokuapp.com/api/";
const NUMBER_OF_CATEGORIES = 6;
const NUMBER_OF_CLUES_PER_CATEGORY = 5;

let categories = [];
let activeClue = null;
let activeClueMode = 0;
let score = 0;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  const playButton = document.getElementById("play");
  const introMusic = document.getElementById("intro-music");
  const spinner = document.getElementById("spinner");

  // Load saved score if any
  const savedScore = localStorage.getItem("playerScore");
  if (savedScore !== null) score = parseInt(savedScore);
  updateScore();

  playButton.addEventListener("click", async () => {
    try {
      introMusic.currentTime = 0;
      await introMusic.play();
      console.log("Intro music started");
    } catch (e) {
      console.warn("Music failed to play, starting game immediately.");
      await startGame();
      return;
    }

    // When music ends, start the game
    introMusic.onended = async () => {
      console.log("Intro music ended");
      await startGame();
    };
  });

  document.getElementById("answer-form").addEventListener("submit", handleAnswerSubmit);
  document.getElementById("active-clue").addEventListener("click", showAnswer);
});

async function startGame() {
  document.getElementById("spinner").classList.add("show");
  await setupTheGame();
  document.getElementById("spinner").classList.remove("show");
}

async function setupTheGame() {
  $("#categories").empty();
  $("#clues").empty();
  $("#active-clue").text("");
  $("#answer-form").addClass("hidden");
  score = 0;
  updateScore();
  activeClue = null;
  activeClueMode = 0;

  const ids = await getCategoryIds();
  categories = [];

  for (let id of ids) {
    const catData = await getCategoryData(id);
    categories.push(catData);
  }

  fillTable(categories);
}

async function getCategoryIds() {
  const res = await axios.get(`${API_URL}categories?count=100`);
  const filtered = res.data.filter(cat => cat.clues_count >= NUMBER_OF_CLUES_PER_CATEGORY);
  const selected = _.sampleSize(filtered, NUMBER_OF_CATEGORIES);
  return selected.map(cat => cat.id);
}

async function getCategoryData(categoryId) {
  const res = await axios.get(`${API_URL}category?id=${categoryId}`);
  const validClues = res.data.clues
    .filter(clue => clue.question && clue.answer)
    .slice(0, NUMBER_OF_CLUES_PER_CATEGORY)
    .map((clue, i) => ({
      id: clue.id,
      value: clue.value || (i + 1) * 100,
      question: clue.question,
      answer: clue.answer
    }));

  return {
    id: res.data.id,
    title: res.data.title,
    clues: validClues
  };
}

function fillTable(categories) {
  const $categoriesRow = $("#categories");
  const $cluesRow = $("#clues");

  for (let cat of categories) {
    const $th = $("<th>").text(cat.title.toUpperCase());
    $categoriesRow.append($th);

    const $td = $("<td>");
    for (let clue of cat.clues) {
      const $clue = $("<div>")
        .addClass("clue")
        .attr("id", `${cat.id}-${clue.id}`)
        .text(`$${clue.value}`);
      $clue.on("click", () => handleClickOfClue(cat.id, clue.id));
      $td.append($clue);
    }

    $cluesRow.append($td);
  }
}

function handleClickOfClue(catId, clueId) {
  if (activeClueMode !== 0) return;

  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  const clue = cat.clues.find(cl => cl.id === clueId);
  if (!clue) return;

  activeClue = clue;
  activeClueMode = 1;
  $(`#${catId}-${clueId}`).remove();

  $("#active-clue").text(clue.question);
  $("#answer-form").removeClass("hidden");
  $("#user-answer").val("").focus();

  document.getElementById("clue-sound").play();

  startTimer();
}

function showAnswer() {
  if (activeClueMode === 2) {
    $("#active-clue").text("");
    activeClue = null;
    activeClueMode = 0;
    $("#answer-form").addClass("hidden");
    clearTimer();
  }
}

function handleAnswerSubmit(evt) {
  evt.preventDefault();
  clearTimer();

  const userAnswer = $("#user-answer").val().trim().toLowerCase();
  const correctAnswer = activeClue.answer.trim().toLowerCase();

  if (userAnswer === correctAnswer) {
    alert("Correct!");
    score += activeClue.value;
  } else {
    alert(`Incorrect! Correct answer: ${activeClue.answer}`);
    score -= activeClue.value;
  }

  updateScore();

  $("#active-clue").text(activeClue.answer);
  activeClueMode = 2;
  $("#answer-form").addClass("hidden");

  // Save score to localStorage
  localStorage.setItem("playerScore", score);

  activeClue = null;
}

function updateScore() {
  $("#score").text(`Score: $${score}`);
}

function startTimer() {
  let timer = 30; // seconds
  $("#timer").text(`Time left: ${timer}s`);
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    timer--;
    $("#timer").text(`Time left: ${timer}s`);
    if (timer <= 0) {
      clearInterval(timerInterval);
      alert("Time's up!");
      showAnswer();
    }
  }, 1000);
}

function clearTimer() {
  clearInterval(timerInterval);
  $("#timer").text("");
}
