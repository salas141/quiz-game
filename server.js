const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = [];  // Yarışmacıların bilgilerini tutacağız
let currentQuestion = 0; // Şu anki soru numarası
let questions = [
  {
    question: "Hangi yıl Türkiye Cumhuriyeti kuruldu?",
    options: ["1920", "1923", "1930"],
    answer: 1 // Doğru cevap: B şıkkı (index 1)
  },
  {
    question: "En yüksek dağ nedir?",
    options: ["Everest", "K2", "Ağrı Dağı"],
    answer: 0 // Doğru cevap: A şıkkı (index 0)
  },
  {
    question: "Türkiye'nin başkenti neresidir?",
    options: ["Mersin", "Adana", "Ankara"],
    answer: 2 // Doğru cevap: C şıkkı (index 2)
  },
  // Diğer sorular...
];

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/game', (req, res) => {
  res.sendFile(__dirname + '/public/game.html');
});

// Yarışmaya başlama ve yeni soru gönderme
io.on('connection', (socket) => {
  console.log('Yeni bir bağlantı oldu: ' + socket.id);

  // Admin yarışmayı başlattığında
  socket.on('startGame', () => {
    io.emit('gameStarted', { question: questions[currentQuestion], questionIndex: currentQuestion });
  });

  // Yarışmacı isim girdiğinde
  socket.on('playerJoined', (playerName) => {
    players.push({ id: socket.id, name: playerName, answer: null, score: 0 });
    console.log(`${playerName} yarışmaya katıldı!`);
  });

  // Yarışmacı bir cevap verdiğinde
  socket.on('answer', (answerIndex) => {
    let player = players.find(p => p.id === socket.id);
    player.answer = answerIndex;
    console.log(`${player.name} cevabını verdi: ${answerIndex}`);
  });

  // Soru bitiminde doğru cevabı ve sonuçları yayınla
  socket.on('endQuestion', () => {
    let correctAnswer = questions[currentQuestion].answer;

    // Yarışmacıların doğru cevabını kontrol et ve puanlarını güncelle
    players.forEach(player => {
      if (player.answer === correctAnswer) {
        player.score += 1;  // Doğru cevaba 1 puan ekle
      }
    });

    let answers = players.map(player => ({
      name: player.name,
      answer: player.answer,
      isCorrect: player.answer === correctAnswer,
      score: player.score
    }));

    // Admin'e doğru cevabı ve sonuçları gönder
    io.emit('questionEnded', {
      correctAnswer: correctAnswer,
      answers: answers,
      questionIndex: currentQuestion,
      players: players  // Güncellenmiş puanları admin'e gönderiyoruz
    });
  });

  // Sonraki soruya geç
  socket.on('nextQuestion', () => {
    currentQuestion++;
    if (currentQuestion < questions.length) {
      io.emit('gameStarted', { question: questions[currentQuestion], questionIndex: currentQuestion });
    } else {
      io.emit('gameOver', players);  // Yarışma bitti
    }
  });

  // Bağlantı kopması
  socket.on('disconnect', () => {
    players = players.filter(p => p.id !== socket.id);
    console.log('Bir oyuncu bağlantıyı kesti');
  });
});

server.listen(3000, () => {
  console.log('Sunucu 3000 portunda çalışıyor');
});
