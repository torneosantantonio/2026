const firebaseConfig = {
  apiKey: "AIzaSyAgLwXKxDuiDvR7snlnSBMaXbzqtLMoQHk",
  authDomain: "torneo-38d29.firebaseapp.com",
  projectId: "torneo-38d29",
  storageBucket: "torneo-38d29.firebasestorage.app",
  messagingSenderId: "329013937191",
  appId: "1:329013937191:web:1ebc647715462ada19fa02",
  measurementId: "G-RFC15SC7VC"
};

if (typeof firebase !== "undefined" && typeof firebase.initializeApp === "function") {
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
}
