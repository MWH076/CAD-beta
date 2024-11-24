import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

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
let currentPlayer = null;
const GRAVITY = 1;
const JUMP_STRENGTH = -15;
const MAX_X = 580;
const MAX_Y = 380;
const PLAYER_SPEED = 5;

let velocities = { player1: { x: 0, y: 0 }, player2: { x: 0, y: 0 } };

document.getElementById("google-login").addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log(`Logged in as ${user.displayName}`);
        joinGame(user);
    } catch (error) {
        console.error("Error logging in:", error);
    }
});

async function joinGame(user) {
    const gameRef = doc(db, "games", "game1");
    const gameSnapshot = await getDoc(gameRef);

    if (!gameSnapshot.exists()) {
        await setDoc(gameRef, {
            player1: user.uid,
            player1Position: { x: 50, y: 0 },
            player2: null,
            player2Position: { x: MAX_X - 50, y: 0 },
            status: "waiting"
        });
        currentPlayer = "player1";
    } else {
        const gameData = gameSnapshot.data();
        if (gameData.status === "waiting") {
            await updateDoc(gameRef, {
                player2: user.uid,
                status: "active"
            });
            currentPlayer = "player2";
        } else {
            alert("Game is full!");
            return;
        }
    }

    document.getElementById("login").style.display = "none";
    document.getElementById("game").style.display = "block";

    onSnapshot(gameRef, (doc) => {
        const data = doc.data();
        updateGame(data);
    });
}

function updateGame(data) {
    const player1Element = document.getElementById("player1");
    const player2Element = document.getElementById("player2");

    if (data.player1Position) {
        player1Element.style.left = `${data.player1Position.x}px`;
        player1Element.style.top = `${data.player1Position.y}px`;
    }
    if (data.player2Position) {
        player2Element.style.left = `${data.player2Position.x}px`;
        player2Element.style.top = `${data.player2Position.y}px`;
    }

    document.getElementById("status").innerText = data.status === "active" ? "Game Active!" : "Waiting for players...";
}

document.addEventListener("keydown", async (event) => {
    if (!currentPlayer) return;
    const key = event.key;
    const gameRef = doc(db, "games", "game1");
    const gameSnapshot = await getDoc(gameRef);
    const gameData = gameSnapshot.data();
    const positionField = currentPlayer === "player1" ? "player1Position" : "player2Position";
    const currentPosition = gameData[positionField];
    if (key === "a" && currentPlayer === "player1") velocities.player1.x = -PLAYER_SPEED;
    if (key === "d" && currentPlayer === "player1") velocities.player1.x = PLAYER_SPEED;
    if (key === "ArrowLeft" && currentPlayer === "player2") velocities.player2.x = -PLAYER_SPEED;
    if (key === "ArrowRight" && currentPlayer === "player2") velocities.player2.x = PLAYER_SPEED;
    if ((key === "w" && currentPlayer === "player1") || (key === "ArrowUp" && currentPlayer === "player2")) {
        const velocityKey = currentPlayer === "player1" ? "player1" : "player2";
        if (currentPosition.y >= MAX_Y) velocities[velocityKey].y = JUMP_STRENGTH;
    }
});

async function clearGame() {
    const gameRef = doc(db, "games", "game1");
    await setDoc(gameRef, {
        player1: null,
        player1Position: { x: 50, y: 0 },
        player2: null,
        player2Position: { x: MAX_X - 50, y: 0 },
        status: "waiting"
    });
    console.log("Game reset to initial state.");
}

document.getElementById("clear-game").addEventListener("click", clearGame);

setInterval(async () => {
    const gameRef = doc(db, "games", "game1");
    const gameSnapshot = await getDoc(gameRef);
    const gameData = gameSnapshot.data();

    for (const player of ["player1", "player2"]) {
        const positionField = `${player}Position`;
        const currentPosition = gameData[positionField];
        const velocity = velocities[player];
        velocity.y += GRAVITY;
        const newX = Math.min(MAX_X, Math.max(0, currentPosition.x + velocity.x));
        const newY = Math.min(MAX_Y, Math.max(0, currentPosition.y + velocity.y));

        await updateDoc(gameRef, {
            [positionField]: { x: newX, y: newY }
        });

        velocity.x = 0;
        if (newY >= MAX_Y) velocity.y = 0;
    }
}, 1000 / 60);