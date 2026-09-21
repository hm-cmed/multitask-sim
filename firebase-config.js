// Firebase コンソール →「プロジェクトの設定」→「マイアプリ（ウェブアプリ）」の設定値を貼り付けてください。
// ここが YOUR_ のままだと、アプリは「ひとりで練習」だけのローカルモードで動きます。
// ウェブ用 apiKey は公開前提の値です。安全性は firestore.rules で守ります。
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "",
  appId: ""
};

// 動画ファイルの直接アップロード（Firebase Storage）を使う場合だけ true。
// Storage の利用には Blaze（従量課金）プランが必要です。動画リンクの登録だけなら false のままで使えます。
export const STORAGE_ENABLED = false;
