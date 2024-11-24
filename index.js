import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDY6K-eT453xY_-KVw12qE10_s8BcAy1EA",
    authDomain: "cad-beta.firebaseapp.com",
    projectId: "cad-beta",
    storageBucket: "cad-beta.firebasestorage.app",
    messagingSenderId: "1064813950737",
    appId: "1:1064813950737:web:e9bd9b846cec933610feb0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("game-container");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let currentPlayer = null;
let gameSession = null;
let playerPositions = { player1: { x: 100, y: 300 }, player2: { x: 600, y: 300 } };

const playerImages = {
    player1: new Image(),
    player2: new Image()
};
playerImages.player1.src = "player1.png";
playerImages.player2.src = "player2.png";

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Object.entries(playerPositions).forEach(([player, pos]) => {
        ctx.drawImage(playerImages[player], pos.x, pos.y, 50, 50);
    });
}

function updatePlayerPosition(player, x, y) {
    if (gameSession) {
        const gameDoc = doc(db, "games", gameSession.id);
        updateDoc(gameDoc, { [`positions.${player}`]: { x, y } });
    }
}

function handleKeyPress(event) {
    if (!currentPlayer) return;

    const pos = playerPositions[currentPlayer];
    if (event.key === "w" && pos.y > 0) pos.y -= 10;
    if (event.key === "a" && pos.x > 0) pos.x -= 10;
    if (event.key === "d" && pos.x < canvas.width - 50) pos.x += 10;

    updatePlayerPosition(currentPlayer, pos.x, pos.y);
}

async function joinGame(user) {
    const gamesRef = collection(db, "games");
    const q = query(gamesRef, where("isFull", "==", false));
    const gameSnapshot = await getDocs(q);

    if (gameSnapshot.empty) {
        const newGame = await addDoc(gamesRef, {
            players: { player1: user.uid },
            positions: playerPositions,
            isFull: false
        });
        gameSession = { id: newGame.id, data: { players: { player1: user.uid }, positions: playerPositions, isFull: false } };
        currentPlayer = "player1";
    } else {
        const gameDoc = gameSnapshot.docs[0];
        const gameData = gameDoc.data();

        currentPlayer = "player2";
        gameData.players.player2 = user.uid;
        gameData.isFull = true;

        await updateDoc(doc(db, "games", gameDoc.id), gameData);

        gameSession = { id: gameDoc.id, data: gameData };
    }

    onSnapshot(doc(db, "games", gameSession.id), (docSnapshot) => {
        const data = docSnapshot.data();
        playerPositions = data.positions;
        renderGame();
    });
}

function initializeGame() {
    document.addEventListener("keydown", handleKeyPress);
    renderGame();
}

loginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    const user = result.user;
    authContainer.style.display = "none";
    gameContainer.style.display = "block";

    await joinGame(user);
    initializeGame();
});

logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    location.reload();
});
