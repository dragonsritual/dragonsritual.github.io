import { startApp } from "./app/startApp.js";

const root = document.querySelector("#app");

startApp(root).catch((error) => {
  console.error(error);
  root.innerHTML = `<pre style="padding:2rem;color:white;background:#111;">Application failed to start.</pre>`;
});
