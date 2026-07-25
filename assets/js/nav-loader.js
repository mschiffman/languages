fetch("/assets/js/nav-version.json", { cache: "no-store" })
  .then((res) => res.json())
  .then(({ v }) => import(`/assets/js/nav-pron.js?v=${v}`));
